import React from "react";
import { TopCategoriesWidget } from "@/components/Insights/TopCategoriesWidget";
import Header from "@/components/Header";

export default function InsightsPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />

            <main className="flex-grow pt-32 pb-20 px-4 md:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col items-center justify-center space-y-12">
                        <div className="w-full flex justify-center">
                            <TopCategoriesWidget />
                        </div>
                    </div>
                </div>
            </main>

            <footer className="w-full">
            </footer>
        </div>
    );
}
