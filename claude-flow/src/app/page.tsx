'use client'

import { SearchPanel } from '@/components/SearchPanel'
import { ResultsPanel } from '@/components/ResultsPanel'
import { LanguageToggle } from '@/components/LanguageToggle'
import { useSearch } from '@/hooks/useSearch'
import { motion, AnimatePresence } from 'framer-motion'

export default function HomePage() {
  const { isSearching, hasResults } = useSearch()

  return (
    <main className="h-full flex flex-col">
      {/* Header with language toggle */}
      <header className="relative z-20 p-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <motion.div 
            className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center"
            whileHover={{ scale: 1.1, rotate: 180 }}
            transition={{ duration: 0.3 }}
          >
            <span className="text-white font-bold text-sm">ES</span>
          </motion.div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            EuroSnapper
          </h1>
        </div>
        <LanguageToggle />
      </header>

      {/* Main split-screen layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Search (40%) */}
        <motion.div 
          className="w-[40%] relative"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Glass panel background */}
          <div className="absolute inset-0 bg-white/5 backdrop-blur-xl border-r border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent" />
          </div>
          
          <div className="relative z-10 h-full">
            <SearchPanel />
          </div>
        </motion.div>

        {/* Separator with glass effect */}
        <div className="w-px bg-gradient-to-b from-transparent via-white/20 to-transparent relative">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/30 via-purple-500/30 to-blue-500/30 blur-sm" />
        </div>

        {/* Right panel - Results (60%) */}
        <motion.div 
          className="flex-1 relative"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        >
          {/* Glass panel background */}
          <div className="absolute inset-0 bg-white/3 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-bl from-purple-500/10 via-indigo-500/10 to-transparent" />
          </div>
          
          <div className="relative z-10 h-full">
            <ResultsPanel />
          </div>
        </motion.div>
      </div>

      {/* Loading overlay */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm z-30 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center space-x-4">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent" />
                <span className="text-white font-medium">Searching...</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}