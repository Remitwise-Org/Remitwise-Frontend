import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

interface TutorialProgress {
  chapters: Record<string, { checkpoints: boolean[] }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { tutorialId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tutorialId } = params;

    const progress = await prisma.tutorialProgress.findUnique({
      where: {
        userId_tutorialId: {
          userId: session.user.id,
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
    console.error("Error fetching tutorial progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch tutorial progress" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { tutorialId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tutorialId } = params;
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
          userId: session.user.id,
          tutorialId,
        },
      },
      create: {
        userId: session.user.id,
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
    console.error("Error saving tutorial progress:", error);
    return NextResponse.json(
      { error: "Failed to save tutorial progress" },
      { status: 500 }
    );
  }
}
