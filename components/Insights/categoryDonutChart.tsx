'use client'

import { useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import { PieChart as PieChartIcon, Info } from 'lucide-react'

// ── Mock data ─────────────────────────────────────────────────────────────────

export interface CategoryDataPoint {
  name: string
  amount: number
  percentage: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ color?: string; payload: CategoryDataPoint }>
}

export const MOCK_CATEGORY_DATA: CategoryDataPoint[] = [
  { name: 'Family Support', amount: 1800, percentage: 56 },
  { name: 'Education',      amount: 850,  percentage: 26 },
  { name: 'Medical',        amount: 390,  percentage: 12 },
  { name: 'Emergency',      amount: 200,  percentage: 6  },
]

const SLICE_COLORS = ['#D72323', '#0ea5e9', '#f59e0b', '#10b981']

const AXIS_COLOR = '#6b7280'

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  const data  = entry.payload as CategoryDataPoint

  return (
    <div className="rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 shadow-2xl text-sm">
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: entry.color }}
        />
        <span className="text-white font-semibold">{data.name}</span>
      </div>
      <div className="space-y-0.5 pl-4">
        <div className="flex justify-between gap-6">
          <span className="text-gray-400">Amount</span>
          <span className="font-bold text-white">${data.amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-gray-400">Share</span>
          <span className="font-bold text-white">{data.percentage}%</span>
        </div>
      </div>
    </div>
  )
}

// ── Custom label inside donut center ─────────────────────────────────────────
interface CenterLabelProps {
  cx: number
  cy: number
  active: CategoryDataPoint | null
  total: number
}

function CenterLabel({ cx, cy, active, total }: CenterLabelProps) {
  return (
    <g>
      {active ? (
        <>
          <text x={cx} y={cy - 10} textAnchor="middle" fill="white" fontSize={18} fontWeight={700}>
            ${active.amount.toLocaleString()}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill={AXIS_COLOR} fontSize={11}>
            {active.name}
          </text>
        </>
      ) : (
        <>
          <text x={cx} y={cy - 10} textAnchor="middle" fill="white" fontSize={18} fontWeight={700}>
            ${total.toLocaleString()}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill={AXIS_COLOR} fontSize={11}>
            Total sent
          </text>
        </>
      )}
    </g>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CategoryDonutChartProps {
  data?: CategoryDataPoint[]
}

export function CategoryDonutChart({ data = MOCK_CATEGORY_DATA }: CategoryDonutChartProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryDataPoint | null>(null)

  const total   = data.reduce((s, d) => s + d.amount, 0)
  const topCat  = data[0]

  return (
    <div className="bg-black/40 border border-white/10 rounded-3xl p-5 sm:p-6 backdrop-blur-sm w-full">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="bg-red-500/10 p-2 rounded-lg shrink-0">
          <PieChartIcon className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h2 className="text-white text-base sm:text-lg font-semibold">Top Categories</h2>
          <p className="text-gray-500 text-xs sm:text-sm">Remittance breakdown</p>
        </div>
      </div>

      {/* Chart + legend layout */}
      <div className="flex flex-col sm:flex-row items-center gap-6">

        {/* Donut */}
        <div className="w-full sm:w-auto flex-shrink-0">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="amount"
                stroke="none"
                onMouseEnter={(_, index) => setActiveCategory(data[index])}
                onMouseLeave={() => setActiveCategory(null)}
                onClick={(_, index) =>
                  setActiveCategory(prev =>
                    prev?.name === data[index].name ? null : data[index]
                  )
                }
                style={{ cursor: 'pointer' }}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={SLICE_COLORS[index % SLICE_COLORS.length]}
                    opacity={
                      activeCategory === null || activeCategory.name === entry.name
                        ? 1
                        : 0.35
                    }
                    style={{ transition: 'opacity 0.2s ease' }}
                  />
                ))}
              </Pie>

              {/* Center label rendered as custom content */}
              <text>
                <CenterLabel cx={0} cy={0} active={activeCategory} total={total} />
              </text>

              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend rows — interactive */}
        <div className="w-full space-y-3">
          {data.map((item, index) => {
            const color     = SLICE_COLORS[index % SLICE_COLORS.length]
            const isActive  = activeCategory?.name === item.name
            const isDimmed  = activeCategory !== null && !isActive

            return (
              <button
                key={item.name}
                type="button"
                onClick={() =>
                  setActiveCategory(prev =>
                    prev?.name === item.name ? null : item
                  )
                }
                className={`w-full text-left space-y-1.5 transition-opacity ${
                  isDimmed ? 'opacity-40' : 'opacity-100'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-white text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold text-sm">
                      ${item.amount.toLocaleString()}
                    </span>
                    <span className="text-gray-500 text-xs w-8 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${item.percentage}%`, backgroundColor: color }}
                  />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Insight alert */}
      {topCat && (
        <div className="mt-6 p-4 bg-red-950/20 border border-red-900/40 rounded-2xl flex gap-3 items-start">
          <Info className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-gray-300 text-sm leading-relaxed">
            <span className="text-red-500 font-semibold">{topCat.percentage}%</span> of your
            remittances go to {topCat.name.toLowerCase()}. Consider setting up automatic transfers!
          </p>
        </div>
      )}
    </div>
  )
}