import { ReactNode } from 'react'

interface DashboardInfoCardProps {
    title: string
    value: string
    icon: ReactNode
}

export default function DashboardInfoCard({
    title,
    value,
    icon,
}: DashboardInfoCardProps) {
    return (
        <div
            className="relative box-border rounded-2xl p-6 overflow-hidden"
            style={{
                background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
        >
            {/* Red glow effect */}
            <div
                className="absolute w-32 h-32 right-0 top-0"
                style={{
                    background: 'rgba(220, 38, 38, 0.1)',
                    filter: 'blur(64px)',
                    borderRadius: '50%',
                }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <span
                        className="text-sm font-normal tracking-tight"
                        style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                    >
                        {title}
                    </span>
                    <div className="w-5 h-5 text-red-600">{icon}</div>
                </div>
                <div className="text-3xl font-bold text-white tracking-wide">
                    {value}
                </div>
            </div>
        </div>
    )
}
