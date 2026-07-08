import React, { useState } from 'react'
import { FiLock, FiLoader, FiInfo, } from 'react-icons/fi'
import { IoMdAnalytics } from "react-icons/io";
import { useApp } from '../context/AppContext'
import PATModal from './PATModal'
import LearnMoreModal from './LearnModeModal'


export default function AnalysisBanner({ page, description, onRun, loading = false, analysisStatus = 'sample', }) {
  const { pat } = useApp()
  const [open, setOpen] = useState(false)
  const [patModalOpen, setPatModalOpen] = useState(false)

  if (analysisStatus === 'complete') return null

  return (
    <>
      <div
        style={{
          marginBottom: 24,

          background: 'var(--surface)',
          border: '1px solid var(--accent-border)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-sm)',

          padding: '20px 22px',

          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 24,

          transition: 'var(--transition)',
        }}
      >
        {/* Left */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            flex: 1,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-sm)',

              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',

              background: 'var(--accent-soft)',
              border: '1px solid var(--accent-border)',

              color: 'var(--accent)',
              flexShrink: 0,
            }}
          >
            <IoMdAnalytics size={20} />

          </div>

          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
              }}
            >

              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--text)',
                }}
              >
                You are viewing <span style={{ color: 'var(--accent)' }}>Standard Analysis</span>
              </span>
            </div>

            <div
              style={{
                fontSize: 13,
                color: 'var(--text2)',
                lineHeight: 1.65,
                maxWidth: 680,
              }}
            >
              {description}
            </div>
          </div>
        </div>

        {/* Right */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{
              padding: '10px 18px',

              borderRadius: 'var(--radius-sm)',

              background: 'transparent',

              border: '1px solid var(--border)',

              color: 'var(--text)',

              display: 'flex',
              alignItems: 'center',
              gap: 8,

              fontSize: 13,
              fontWeight: 500,

              transition: 'var(--transition)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--surface2)'
              e.currentTarget.style.borderColor = 'var(--accent-border)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          >
            <FiInfo size={15} />
            Learn More
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              if (!pat) {
                setPatModalOpen(true)
                return
              }

              onRun()
            }}
            style={{
              padding: '10px 18px',

              borderRadius: 'var(--radius-sm)',

              border: 'none',

              background: 'var(--accent)',
              color: '#111',

              display: 'flex',
              alignItems: 'center',
              gap: 8,

              fontWeight: 600,
              fontSize: 13,

              cursor: loading ? 'not-allowed' : 'pointer',

              opacity: loading ? 0.65 : 1,

              boxShadow: '0 4px 14px rgba(245,197,24,.18)',

              transition: 'var(--transition)',
            }}
            onMouseEnter={e => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow =
                  '0 8px 22px rgba(245,197,24,.25)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow =
                '0 4px 14px rgba(245,197,24,.18)'
            }}
          >
            {loading ? (
              <>
                <FiLoader className="spin" size={15} />
                Running...
              </>
            ) : (
              <>
                <FiLock size={14} />
                {pat ? 'Run Complete Analysis' : 'Connect PAT & Run'}
              </>
            )}
          </button>
        </div>
      </div>
      <PATModal
        open={patModalOpen}
        onClose={() => setPatModalOpen(false)}
      />
      <LearnMoreModal
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}