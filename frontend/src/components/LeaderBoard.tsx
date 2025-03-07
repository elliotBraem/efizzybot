import { Search,ChevronDown } from "lucide-react"



export default function Leaderboard() {
  // Sample data for the leaderboard
  const leaderboardData = [
    {
      rank: 1,
      curator: "Web3Plug",
      badge: "Approver",
      platform: "@plugrel",
      submissions: "1,200",
      image:"/nft1.png",
      topFeeds: [
        { name: "#NEARWEEK", count: "52/60" },
        { name: "#Cryptogrant", count: "52/60" },
        { name: "#Publicgoods", count: "52/60" },
      ],
    },
    {
      rank: 2,
      curator: "0xLoki.base",
      platform: "@lokibase",
      image:"/nft2.png",
      submissions: "1,200",
      topFeeds: [{ name: "#Bitcoin", count: "52/60", plus: "+3" }],
    },
    {
      rank: 3,
      curator: "Zack Herm",
      platform: "@zackherm",
      image:"/nft3.png",
      submissions: "1,200",
      topFeeds: [{ name: "#Bitcoin", count: "52/60", plus: "+3" }],
    },
    {
      rank: 4,
      curator: "Elliot Braem",
      platform: "@elliot_braem",
      image:"/nft4.png",
      submissions: "1,200",
      topFeeds: [{ name: "#Bitcoin", count: "52/60", plus: "+3" }],
    },
    {
      rank: 5,
      curator: "Alex_Aptos",
      platform: "@Alex_Aptos",
      image:"/nft5.png",
      submissions: "1,200",
      topFeeds: [{ name: "#Bitcoin", count: "52/60", plus: "+3" }],
    },
    {
      rank: 6,
      curator: "Amichael_design",
      platform: "@Amichael_Design",
      image:"/nft6.png",
      submissions: "1,200",
      topFeeds: [{ name: "#Bitcoin", count: "52/60", plus: "+3" }],
    },
    {
      rank: 7,
      curator: "Web3Plug",
      badge: "murica/acc",
      platform: "@plugrel",
      image:"/nft1.png",
      submissions: "1,200",
      topFeeds: [{ name: "#Bitcoin", count: "52/60", plus: "+3" }],
    },
    {
      rank: 8,
      curator: "Web3Plug",
      badge: "murica/acc",
      platform: "@plugrel",
      image:"/nft1.png",
      submissions: "1,200",
      topFeeds: [{ name: "#Bitcoin", count: "52/60", plus: "+3" }],
    },
  ]

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
            className="pl-10 pr-4 py-2 border border-[#e5e5e5] rounded-md w-full md:w-[300px] focus:outline-none focus:ring-2 focus:ring-[#60a5fa] focus:border-transparent"
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-auto">
            <button className="flex items-center justify-between gap-2 px-4 py-2 border border-[#e5e5e5] rounded-md bg-white w-full md:w-auto">
              <span className="text-[#111111]">All Categories</span>
              <ChevronDown className="h-4 w-4 text-[#64748b]" />
            </button>
          </div>
          <div className="relative w-full md:w-auto">
            <button className="flex items-center justify-between gap-2 px-4 py-2 border border-[#e5e5e5] rounded-md bg-white w-full md:w-auto">
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
                <th className="text-left py-4 px-2 text-[#64748b] font-medium text-sm whitespace-nowrap">Rank</th>
                <th className="text-left py-4 px-2 text-[#64748b] font-medium text-sm whitespace-nowrap">Curator</th>
                <th className="text-left py-4 px-2 text-[#64748b] font-medium text-sm whitespace-nowrap">Platform</th>
                <th className="text-left py-4 px-2 text-[#64748b] font-medium text-sm whitespace-nowrap">Submissions</th>
                <th className="text-left py-4 px-2 text-[#64748b] font-medium text-sm whitespace-nowrap">Top Feeds</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.map((item, index) => (
                <tr key={index} className="border-b border-[#e5e5e5] hover:bg-[#f9fafb]">
                  <td className="py-4 px-2">
                    <div className="flex items-center">
                      {item.rank === 1 && <img src="/icons/star-gold.svg" className="h-5 w-5 mr-1"/>}
                      {item.rank === 2 && <img src="/icons/star-slive.svg" className="h-5 w-5 mr-1"/>}
                      {item.rank === 3 && <img src="/icons/star-brone.svg" className="h-5 w-5 mr-1"/>}
                      <span className="text-[#111111] font-medium">{item.rank}</span>
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
                          <span className="font-medium text-[#111111]">{item.curator}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-2 text-[#64748b]">{item.platform}</td>
                  <td className="py-4 px-2 text-[#111111] font-medium">{item.submissions}</td>
                  <td className="py-4 px-2">
                    <div className="flex flex-wrap gap-2">
                      {item.topFeeds.map((feed, feedIndex) => (
                        <div key={feedIndex} className="flex items-center gap-1">
                          <span className="bg-[#f1f5f9] text-[#64748b] text-xs px-2 py-1 rounded-md">{feed.name}</span>
                          <span className="text-xs text-[#64748b]">{feed.count}</span>
                          {feed.plus && (
                            <span className="text-xs bg-[#f1f5f9] text-[#64748b] px-1 rounded">{feed.plus}</span>
                          )}
                        </div>
                      ))}
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