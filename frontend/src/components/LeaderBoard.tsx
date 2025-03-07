import { Search,ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { useLeaderboard, LeaderboardEntry } from "../lib/api";


export default function Leaderboard() {
  const [expandedRows, setExpandedRows] = useState<number[]>([])
  const { data: leaderboard, isLoading, error } = useLeaderboard();

  const toggleRow = (index: number) => {
    setExpandedRows(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-[#111111] mb-4">Leaderboard</h1>
        <p className="text-[#64748b] max-w-2xl mx-auto">
          Top Performing Curators ranked by submissions, engagement and activities.
        </p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#a3a3a3] h-4 w-4" />
          <input
            type="text"
            placeholder="Search"
            className="pl-10 pr-4 py-2 border border-neutral-300 rounded-md w-full md:w-[300px] focus:outline-none focus:ring-2 focus:ring-[#60a5fa] focus:border-transparent"
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-auto">
            <button className="flex items-center justify-between gap-2 px-4 py-2 border border-neutral-300 rounded-md bg-white w-full md:w-auto">
              <span className="text-[#111111]">All Categories</span>
              <ChevronDown className="h-4 w-4 text-[#64748b]" />
            </button>
          </div>
          <div className="relative w-full md:w-auto">
            <button className="flex items-center justify-between gap-2 px-4 py-2 border border-neutral-300 rounded-md bg-white w-full md:w-auto">
              <span className="text-[#111111]">All Time</span>
              <ChevronDown className="h-4 w-4 text-[#64748b]" />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        <div className="relative">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-[#e5e5e5]">
                <th className="text-left py-4 px-2 font-medium text-sm whitespace-nowrap">Rank</th>
                <th className="text-left py-4 px-2 font-medium text-sm whitespace-nowrap">Curator</th>
                <th className="text-left py-4 px-2 font-medium text-sm whitespace-nowrap">Platform</th>
                <th className="text-left py-4 px-2 font-medium text-sm whitespace-nowrap">Submissions</th>
                <th className="text-left py-4 px-2 font-medium text-sm whitespace-nowrap">Top Feeds</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <div className="text-left py-8">
                  <p>Loading leaderboard data...</p>
                </div>
              )}

              {error && (
                <div className="text-left py-8 text-red-500">
                  <p>Error loading leaderboard: {(error as Error).message}</p>
                </div>
              )}

              {leaderboard && leaderboard.length === 0 && (
                <div className="text-left py-8">
                  <p>No curator data available.</p>
                </div>
              )}
              {leaderboard && leaderboard.map((item: LeaderboardEntry, index) => (
                <tr key={index} className="border-b border-[#e5e5e5] hover:bg-[#f9fafb]">
                  <td className="py-4 px-2">
                    <div className="flex items-center">
                      {index+1 === 1 && <img src="/icons/star-gold.svg" className="h-5 w-5 mr-1"/>}
                      {index+1 === 2 && <img src="/icons/star-slive.svg" className="h-5 w-5 mr-1"/>}
                      {index+1 === 3 && <img src="/icons/star-brone.svg" className="h-5 w-5 mr-1"/>}
                      <span className="text-[#111111] font-medium">{index+1}</span>
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-2">
                      {/* <div className="hexagon-avatar">
                        <img
                          src={item.image}
                          width={32}
                          height={32}
                          alt={item.curator}
                          className="h-full w-full object-cover"
                        />
                      </div> */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#111111]">{item.curatorUsername}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-2">Twitter</td>
                  <td className="py-4 px-2 text-[#111111] font-medium">{item.submissionCount}</td>
                  <td className="py-4 px-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 border border-neutral-400 px-2 py-1 rounded-md">
                          <span className="text-sm">{item.feedSubmissions[0].feedId}</span>
                          <span className="text-sm">{item.feedSubmissions[0].count}</span>
                        </div>
                        
                        {item.feedSubmissions.length > 1 && (
                          <button 
                            onClick={() => toggleRow(index)}
                            className="w-8 h-8 flex items-center justify-center border border-neutral-400 rounded-md transition-colors"
                          >
                            {expandedRows.includes(index) ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <span className="text-xs">
                                +{item.feedSubmissions.length - 1}
                              </span>
                            )}
                          </button>
                        )}
                      </div>

                      {expandedRows.includes(index) && (
                        <div className="flex flex-col gap-2 mt-2 pl-0">
                          {item.feedSubmissions.slice(1).map((feed, feedIndex) => (
                            <div key={feedIndex} className="flex items-center">
                              <div className="flex items-center gap-1 border border-neutral-400 px-2 py-1 rounded-md">
                                <span className="text-sm">{feed.feedId}</span>
                                <span className="text-sm">{feed.count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}