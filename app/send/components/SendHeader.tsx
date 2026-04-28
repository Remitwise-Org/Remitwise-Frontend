'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Users } from 'lucide-react'

export default function SendHeader() {
    const router = useRouter()

    return (
        <header className="bg-[#010101] text-white py-6 px-4 sm:px-6 lg:px-8 border-b border-white/5">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center justify-center w-10 h-10 rounded-[14px] border border-white/10 border-t-white/[0.08] bg-[linear-gradient(135deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0.05)_100%)] transition-colors hover:bg-white/20"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold">Send Remittance</h1>
                        <p className="text-sm text-[#FFFFFF66] hidden sm:block">Transfer money via Stellar network</p>
                    </div>
                </div>

                <button
                    className="hidden sm:flex items-center gap-2 bg-[linear-gradient(135deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0.05)_100%)] px-4 h-[34px] rounded-[14px] border border-white/10 border-t-white/[0.08] transition-colors hover:bg-white/20"
                >
                    <Users className="w-5 h-5" />
                    <span className="text-sm font-medium hidden sm:inline">Address Book</span>
                </button>
            </div>
        </header>
    )
}
