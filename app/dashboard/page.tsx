'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DollarSign, LineChart, PieChart, Users, Sun, Moon } from 'lucide-react'
import { useWeb3 } from '@/contexts/Web3Context'
import { DYNAMICNFT_CONTRACT_ADDRESS } from '@/config/addresses'

export default function Dashboard() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const { DynamicNFTContract, RoyaltyContract, MonitorContract, account, selectedNetwork } = useWeb3()

  const [creatorNFTs, setCreatorNFTs] = useState([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [averageRoyaltyRate, setAverageRoyaltyRate] = useState(0)
  const [recentTransactions, setRecentTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCreatorNFTs = useCallback(async () => {
    if (selectedNetwork !== 'SEPOLIA') {
      setError("Please switch to the Sepolia network to view your creator dashboard.")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const totalSupply = Number(await DynamicNFTContract.methods.totalSupply().call())
      const nfts = []
      let totalRoyalty = 0
      let totalRoyaltyCount = 0

      for (let i = 0; i < totalSupply; i++) {
        const tokenId = await DynamicNFTContract.methods.tokenByIndex(i).call()
        const royaltyConfig = await RoyaltyContract.methods.getRoyaltyInfo(DYNAMICNFT_CONTRACT_ADDRESS, tokenId).call()
        
        if (royaltyConfig.beneficiary.toLowerCase() === account.toLowerCase()) {
          const owner = await DynamicNFTContract.methods.ownerOf(tokenId).call()
          nfts.push({
            id: tokenId,
            owner: owner,
            royaltyRate: Number(royaltyConfig.baseRate) / 100,
            royaltyAmount: 0.0001 // Placeholder value, replace with actual calculation if available
          })

          totalRoyalty += Number(royaltyConfig.baseRate)
          totalRoyaltyCount++
        }
      }
     
      setCreatorNFTs(nfts)
      setAverageRoyaltyRate(totalRoyaltyCount > 0 ? (totalRoyalty / totalRoyaltyCount) / 100 : 0)
      
      const revenue = await calculateTotalRevenue(nfts)
      setTotalRevenue(revenue)

      const transactions = await fetchRecentTransactions(nfts)
      setRecentTransactions(transactions)

    } catch (error) {
      console.error("Error fetching creator NFTs:", error)
      setError("Failed to fetch creator NFTs. Please try again later.")
    } finally {
      setLoading(false)
    }
  }, [DynamicNFTContract, RoyaltyContract, MonitorContract, account, selectedNetwork])

  const calculateTotalRevenue = useCallback(async (nfts) => {
    let totalRevenue = 0
    for (const nft of nfts) {
      const priceHistory = await MonitorContract.methods.getPriceHistory(DYNAMICNFT_CONTRACT_ADDRESS, nft.id).call()
      for (const sale of priceHistory) {
        // Placeholder royalty calculation, replace with actual calculation if available
        const royaltyAmount = Number(sale.price) * 0.01
        totalRevenue += royaltyAmount
      }
    }
    return totalRevenue / 1e18 // Convert from wei to ETH
  }, [MonitorContract])

  const fetchRecentTransactions = useCallback(async (nfts) => {
    const transactions = []
    for (const nft of nfts) {
      const priceHistory = await MonitorContract.methods.getPriceHistory(DYNAMICNFT_CONTRACT_ADDRESS, nft.id).call()
      for (const sale of priceHistory.slice(-5)) {
        // Placeholder royalty calculation, replace with actual calculation if available
        const royaltyAmount = Number(sale.price) * 0.01
        transactions.push({
          tokenId: nft.id,
          price: Number(sale.price) / 1e18,
          royalty: royaltyAmount / 1e18,
          timestamp: new Date(Number(sale.timestamp) * 1000).toLocaleString()
        })
      }
    }
    return transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5)
  }, [MonitorContract])

  useEffect(() => {
    setMounted(true)
    if (account) {
      fetchCreatorNFTs()
    }
  }, [account, fetchCreatorNFTs, selectedNetwork])

  if (!mounted) return null

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:bg-gray-900/95 dark:border-gray-800">
          <div className="container flex items-center justify-between h-16 px-4">
            <h1 className="text-2xl font-bold dark:text-white">Creator Dashboard</h1>
            
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900">
          <div className="container mx-auto px-6 py-8">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-lg dark:text-white">Loading dashboard data...</p>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : creatorNFTs.length === 0 ? (
              <Card className="mb-8">
                <CardContent className="pt-6">
                  <p className="text-center text-gray-600 dark:text-gray-300 mb-4">You haven't minted any NFTs yet.</p>
                  <div className="flex justify-center">
                    <Button onClick={() => router.push('/create-nft')}>Mint Your First NFT</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-6 mb-8 md:grid-cols-2 xl:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalRevenue.toFixed(4)} ETH</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Collections</CardTitle>
                      <PieChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{creatorNFTs.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Royalty Rate</CardTitle>
                      <LineChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{averageRoyaltyRate.toFixed(2)}%</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">N/A</div>
                      <p className="text-xs text-muted-foreground">Not possible due to Reactive Network 😊</p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Your NFTs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Token ID</TableHead>
                          <TableHead>Current Owner</TableHead>
                          <TableHead>Royalty Rate</TableHead>
                          <TableHead>Royalty Amount (1 ETH sale)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {creatorNFTs.map((nft) => (
                          <TableRow key={nft.id}>
                            <TableCell>{nft.id}</TableCell>
                            <TableCell>{nft.owner}</TableCell>
                            <TableCell>{nft.royaltyRate.toFixed(2)}%</TableCell>
                            <TableCell>{nft.royaltyAmount.toFixed(4)} ETH</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Token ID</TableHead>
                          <TableHead>Sale Price</TableHead>
                          <TableHead>Royalty Earned</TableHead>
                          <TableHead>Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentTransactions.map((tx, index) => (
                          <TableRow key={index}>
                            <TableCell>{tx.tokenId}</TableCell>
                            <TableCell>{tx.price.toFixed(4)} ETH</TableCell>
                            <TableCell>{tx.royalty.toFixed(4)} ETH</TableCell>
                            <TableCell>{tx.timestamp}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}

            <div className="flex justify-center mt-8">
              <Button onClick={() => router.push('/listNFTs')}>List Your NFTs</Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}