/**
 * CivicGrid — Screen 5: AI Chatbot
 * Full-screen chat interface similar to WhatsApp/AI messengers
 * Chat bubbles for User and AI
 * Text input field with Microphone icon for speech input
 * Suggested prompt chips for improved UX guidance
 * Support editing user messages and undoing message exchanges
 * Image attachment & upload feature with thumbnail previews
 */
import { useState, useEffect, useRef } from 'react'
import useStore from '../../store/useStore.js'

const SYSTEM_INTRO = {
  sender: 'ai',
  text: 'Welcome to the CivicGrid Intelligent Assistant.\n\nI can assist you with details regarding:\n- Incident reporting guidelines\n- Civic Trust score metrics\n- Active ticket tracking\n- Municipal SLA timelines',
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const CHAT_LOGIC = [
  { keywords: ['report', 'how to', 'upload'], reply: 'To report an issue, navigate to the Dashboard and click the primary "Report an Issue" button or the floating plus action button. Attach the required photo or video file, check the GPS position coordinates, and click submit.' },
  { keywords: ['score', 'trust', 'points', 'level'], reply: 'Civic Trust scores are awarded based on engagement metrics:\n- Filing reports: +10 points\n- Verifying adjacent reports: +5 points\n- Closed/resolved issues: +20 points\nLevels scale from Contributor up to Guardian tiers.' },
  { keywords: ['ticket', 'my issue', 'status'], reply: 'Open the "My Tickets" section in the navigation options to view all incidents logged by your account. Select any item to expand and trace its municipal resolution timeline.' },
  { keywords: ['sla', 'time', 'deadline', 'hours'], reply: 'SLA parameters are structured by priority score:\n- Critical priority: 4 hours resolution target\n- High priority: 24 hours resolution target\n- Medium priority: 48 hours resolution target\n- Low priority: 72 hours resolution target\nEscalations are handled automatically by municipal supervisors upon SLA breach.' },
]

const QUICK_PROMPTS = [
  { text: 'How do I report a pothole?', key: 'report' },
  { text: 'What is my Civic Trust Score?', key: 'score' },
  { text: 'How do I track my active tickets?', key: 'ticket' },
  { text: 'What are the SLA time targets?', key: 'sla' },
]

const Icons = {
  send: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
  ),
  mic: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v1a7 7 0 0 1-14 0v-1"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
  ),
  bot: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8.01" y2="16"></line><line x1="16" y1="16" x2="16.01" y2="16"></line></svg>
  ),
  user: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
  ),
  pencil: (
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
  ),
  undo: (
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>
  ),
  paperclip: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
  )
}

export default function ChatbotTab() {
  const { user } = useStore()
  const [messages, setMessages] = useState([SYSTEM_INTRO])
  const [inputVal, setInputVal] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState(null)

  // Edit Message States
  const [editingIndex, setEditingIndex] = useState(null)
  const [editingText, setEditingText] = useState('')

  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)
  const fileInputRef = useRef(null)

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const rec = new SpeechRecognition()
      rec.continuous = false
      rec.interimResults = false
      rec.lang = 'en-US'

      rec.onresult = (event) => {
        const text = event.results[0][0].transcript
        setInputVal((prev) => prev ? `${prev} ${text}` : text)
        setIsRecording(false)
      }

      rec.onerror = () => setIsRecording(false)
      rec.onend = () => setIsRecording(false)

      recognitionRef.current = rec
    }
  }, [])

  const handleMicToggle = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Try Chrome or Safari.')
      return
    }
    if (isRecording) {
      recognitionRef.current.stop()
    } else {
      setIsRecording(true)
      recognitionRef.current.start()
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedImage(reader.result) // Base64 string
      }
      reader.readAsDataURL(file)
    }
    // Reset file input value so same file can be selected again
    e.target.value = ''
  }

  const handleSend = () => {
    if (!inputVal.trim() && !selectedImage) return

    const newMsg = {
      sender: 'user',
      text: inputVal,
      image: selectedImage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, newMsg])
    setInputVal('')
    setSelectedImage(null)
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      let matchedReply = "I am trained on municipal routing and incident resolution guidelines. Please specify your query regarding tickets, report procedures, or system SLAs."
      
      if (newMsg.image) {
        matchedReply = "I have received your image attachment. Our municipal routing system uses image classification to inspect civic hazards. This reported hazard is being evaluated by public safety dispatch."
      } else {
        const lowerInput = newMsg.text.toLowerCase()
        for (const logic of CHAT_LOGIC) {
          if (logic.keywords.some(keyword => lowerInput.includes(keyword))) {
            matchedReply = logic.reply
            break
          }
        }
      }

      setMessages(prev => [...prev, {
        sender: 'ai',
        text: matchedReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }])
      setIsTyping(false)
    }, 1200)
  }

  const handleQuickPromptClick = (text) => {
    const newMsg = {
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, newMsg])
    setIsTyping(true)

    setTimeout(() => {
      let matchedReply = "I am trained on municipal routing and incident resolution guidelines. Please specify your query regarding tickets, report procedures, or system SLAs."
      const lowerInput = text.toLowerCase()

      for (const logic of CHAT_LOGIC) {
        if (logic.keywords.some(keyword => lowerInput.includes(keyword))) {
          matchedReply = logic.reply
          break
        }
      }

      setMessages(prev => [...prev, {
        sender: 'ai',
        text: matchedReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }])
      setIsTyping(false)
    }, 1000)
  }

  const handleSaveEdit = (idx) => {
    if (!editingText.trim()) return

    // 1. Update text of message at idx
    const updatedMessages = [...messages]
    updatedMessages[idx] = {
      ...updatedMessages[idx],
      text: editingText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    // 2. Discard all subsequent messages (AI response and future exchanges)
    const truncated = updatedMessages.slice(0, idx + 1)
    
    setMessages(truncated)
    setEditingIndex(null)
    setIsTyping(true)

    // 3. Trigger new AI response based on edited text
    setTimeout(() => {
      let matchedReply = "I am trained on municipal routing and incident resolution guidelines. Please specify your query regarding tickets, report procedures, or system SLAs."
      
      if (updatedMessages[idx].image) {
        matchedReply = "I have received your image attachment. Our municipal routing system uses image classification to inspect civic hazards. This reported hazard is being evaluated by public safety dispatch."
      } else {
        const lowerInput = editingText.toLowerCase()
        for (const logic of CHAT_LOGIC) {
          if (logic.keywords.some(keyword => lowerInput.includes(keyword))) {
            matchedReply = logic.reply
            break
          }
        }
      }

      setMessages(prev => [...prev, {
        sender: 'ai',
        text: matchedReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }])
      setIsTyping(false)
    }, 1200)
  }

  const handleUndo = (idx) => {
    // Filter out this user message (at idx) and the AI response that follows it (at idx + 1)
    setMessages(prev => prev.filter((_, i) => i !== idx && i !== idx + 1))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend()
  }

  return (
    <div className="chat-screen">
      <div className="chat-box">
        {/* ── Messages Area ──────────────────────────────────────── */}
        <div className="chat-messages">
          {messages.map((m, idx) => {
            const isUser = m.sender === 'user'
            return (
              <div key={idx} className={`chat-bubble-row ${isUser ? 'user' : ''}`}>
                <div
                  className="chat-avatar"
                  style={{
                    background: isUser ? 'var(--bg-input)' : 'var(--accent-light)',
                    color: isUser ? 'var(--text-secondary)' : 'var(--accent)',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid var(--border)'
                  }}
                >
                  {isUser ? Icons.user : Icons.bot}
                </div>
                <div className="chat-bubble-container">
                  <div className={`chat-bubble ${isUser ? 'user' : 'ai'}`} style={{ display: 'flex', flexDirection: 'column' }}>
                    
                    {/* Render Image attachment inside bubble if exists */}
                    {m.image && (
                      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px', marginBottom: '8px', maxWidth: '320px', maxHeight: '220px' }}>
                        <img
                          src={m.image}
                          alt="Uploaded attachment"
                          style={{
                            width: '100%',
                            height: '100%',
                            maxHeight: '220px',
                            objectFit: 'cover',
                            borderRadius: '12px',
                            display: 'block'
                          }}
                        />
                      </div>
                    )}

                    {editingIndex === idx ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px' }}>
                        <textarea
                          value={editingText}
                          onChange={e => setEditingText(e.target.value)}
                          style={{
                            width: '100%',
                            background: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            border: '1.5px solid var(--accent)',
                            borderRadius: '6px',
                            padding: '8px',
                            fontSize: '0.85rem',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            minHeight: '60px'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setEditingIndex(null)}
                            style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '4px' }}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSaveEdit(idx)}
                            style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '4px' }}
                          >
                            Save & Submit
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ whiteSpace: 'pre-line', fontSize: '0.88rem', lineHeight: 1.5 }}>{m.text}</div>
                        <div className="chat-time" style={{ color: isUser ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
                          {m.time}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions (Edit / Undo) for User Prompts */}
                  {isUser && editingIndex !== idx && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px', justifyContent: 'flex-end', opacity: 0.8 }}>
                      <button
                        type="button"
                        title="Edit message"
                        onClick={() => {
                          setEditingIndex(idx)
                          setEditingText(m.text)
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.72rem' }}
                        onMouseOver={e => e.currentTarget.style.color = 'var(--accent)'}
                        onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        {Icons.pencil} Edit
                      </button>
                      <button
                        type="button"
                        title="Undo message"
                        onClick={() => handleUndo(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.72rem' }}
                        onMouseOver={e => e.currentTarget.style.color = 'var(--sev-critical)'}
                        onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        {Icons.undo} Undo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Dynamic Suggested Action Prompts (Shows when history is clean) */}
          {messages.length === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '16px 0 16px 42px', maxWidth: '500px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Suggested Queries
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {QUICK_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickPromptClick(p.text)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all var(--t-fast)',
                      textAlign: 'left'
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.borderColor = 'var(--accent)'
                      e.currentTarget.style.background = 'var(--bg-card-hover)'
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'var(--bg-card)'
                    }}
                  >
                    {p.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isTyping && (
            <div className="chat-bubble-row">
              <div
                className="chat-avatar"
                style={{
                  background: 'var(--accent-light)',
                  color: 'var(--accent)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid var(--border)'
                }}
              >
                {Icons.bot}
              </div>
              <div className="chat-typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Image Upload Preview Thumbnail Bar ────────────────── */}
        {selectedImage && (
          <div style={{
            padding: '10px 16px',
            background: 'var(--bg-card-hover)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'fadeIn var(--t-fast)'
          }}>
            <div style={{ position: 'relative', width: '52px', height: '52px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
              <img src={selectedImage} alt="Attachment thumbnail preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                style={{
                  position: 'absolute', top: '2px', right: '2px',
                  width: '16px', height: '16px', borderRadius: '50%',
                  background: 'rgba(15, 23, 42, 0.8)', color: '#fff',
                  border: 'none', fontSize: '10px', fontWeight: 'bold',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  boxShadow: 'var(--shadow-xs)'
                }}
                title="Clear attachment"
              >
                ×
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>Evidence Attached</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Will be uploaded when you press send</span>
            </div>
          </div>
        )}

        {/* ── Chat Input Bar ─────────────────────────────────────── */}
        <div className="chat-input-bar">
          
          {/* File input for images */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleFileChange}
          />

          <button
            type="button"
            className="chat-mic"
            onClick={() => fileInputRef.current.click()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--border)' }}
            title="Attach image evidence"
          >
            {Icons.paperclip}
          </button>

          <button
            className={`chat-mic ${isRecording ? 'recording' : ''}`}
            onClick={handleMicToggle}
            style={{ background: isRecording ? 'var(--sev-critical)' : 'none', color: isRecording ? '#fff' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--border)' }}
            title="Voice query"
          >
            {Icons.mic}
          </button>
          
          <input
            className="chat-input"
            placeholder={isRecording ? 'Awaiting audio input...' : 'Ask about municipal procedures or report statuses...'}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isRecording}
          />
          <button className="chat-send" onClick={handleSend} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icons.send}
          </button>
        </div>
      </div>
    </div>
  )
}
