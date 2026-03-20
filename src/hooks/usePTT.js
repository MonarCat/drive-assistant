import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

export function usePTT(user, activeConvoy, isDemo) {
  const [pttActive, setPTTActive]       = useState(false)
  const [pttStatus, setPTTStatus]       = useState('idle') // idle|connecting|connected|transmitting
  const [peerCount, setPeerCount]       = useState(0)
  const [sessions, setSessions]         = useState([])
  const streamRef                       = useRef(null)
  const peerConnectionsRef              = useRef({})
  const channelRef                      = useRef(null)

  useEffect(() => {
    if (isDemo || !user?.id || !activeConvoy) return

    // Subscribe to PTT signalling for this convoy
    channelRef.current = supabase
      .channel(`ptt-${activeConvoy.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ptt_sessions' },
        payload => handleIncomingOffer(payload.new)
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ptt_sessions' },
        payload => handleAnswer(payload.new)
      )
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      stopPTT()
    }
  }, [activeConvoy?.id, isDemo])

  async function handleIncomingOffer(session) {
    if (session.initiator_id === user.id) return // own offer
    if (session.status !== 'open') return

    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      })

      peerConnectionsRef.current[session.id] = pc

      // Add local audio track
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => pc.addTrack(track, streamRef.current))
      }

      // Handle remote audio
      pc.ontrack = event => {
        const audio = new Audio()
        audio.srcObject = event.streams[0]
        audio.play().catch(() => {})
      }

      // Set remote description from offer
      await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'offer',
        sdp:  session.offer_sdp,
      }))

      // Create answer
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      // Post answer to Supabase
      await supabase.from('ptt_sessions')
        .update({ answer_sdp: answer.sdp, status: 'connected' })
        .eq('id', session.id)

      setPeerCount(prev => prev + 1)
      setPTTStatus('connected')

    } catch (e) {
      console.error('PTT answer error:', e.message)
    }
  }

  async function handleAnswer(session) {
    const pc = peerConnectionsRef.current[session.id]
    if (!pc || !session.answer_sdp) return
    if (pc.signalingState !== 'have-local-offer') return

    try {
      await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp:  session.answer_sdp,
      }))
      setPTTStatus('connected')
    } catch {}
  }

  async function startPTT() {
    if (!activeConvoy) return
    setPTTStatus('connecting')

    try {
      // Get microphone
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })

      // Create WebRTC offer
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })

      streamRef.current.getTracks().forEach(track => pc.addTrack(track, streamRef.current))

      pc.ontrack = event => {
        const audio = new Audio()
        audio.srcObject = event.streams[0]
        audio.play().catch(() => {})
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Signal via Supabase
      const { data: session } = await supabase.from('ptt_sessions').insert({
        session_type: 'convoy',
        convoy_id:    activeConvoy.id,
        initiator_id: user.id,
        offer_sdp:    offer.sdp,
        status:       'open',
      }).select().single()

      peerConnectionsRef.current[session.id] = pc
      setPTTActive(true)
      setPTTStatus('transmitting')

    } catch (e) {
      setPTTStatus('idle')
      console.error('PTT start error:', e.message)
    }
  }

  function stopPTT() {
    // Close all peer connections
    Object.values(peerConnectionsRef.current).forEach(pc => {
      try { pc.close() } catch {}
    })
    peerConnectionsRef.current = {}

    // Stop microphone
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null

    setPTTActive(false)
    setPTTStatus('idle')
    setPeerCount(0)
  }

  return { pttActive, pttStatus, peerCount, startPTT, stopPTT }
}
