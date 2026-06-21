import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";

interface TutorialProgress {
  chapters: Record<string, { checkpoints: boolean[] }>;
}

async function getUserId(): Promise<string | null> {
  const { address } = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { stellar_address: address },
  });
  return user?.id ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tutorialId: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tutorialId } = await params;

    const progress = await prisma.tutorialProgress.findUnique({
      where: {
        userId_tutorialId: {
          userId,
          tutorialId,
        },
      },
    });

    if (!progress) {
      return NextResponse.json({ chapters: {} });
    }

    const data = JSON.parse(progress.data) as TutorialProgress;
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Error fetching tutorial progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch tutorial progress" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tutorialId: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tutorialId } = await params;
    const body: TutorialProgress = await request.json();

    // Validate the progress data structure
    if (!body.chapters || typeof body.chapters !== "object") {
      return NextResponse.json(
        { error: "Invalid progress data" },
        { status: 400 }
      );
    }

    const progress = await prisma.tutorialProgress.upsert({
      where: {
        userId_tutorialId: {
          userId,
          tutorialId,
        },
      },
      create: {
        userId,
        tutorialId,
        data: JSON.stringify(body),
      },
      update: {
        data: JSON.stringify(body),
      },
    });

    const data = JSON.parse(progress.data) as TutorialProgress;
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Error saving tutorial progress:", error);
    return NextResponse.json(
      { error: "Failed to save tutorial progress" },
      { status: 500 }
    );
  }
}
