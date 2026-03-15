import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
 
const COMMANDS = {
  AUDIO_STOLEN_WARNING: async () => {
    const msg = "WARNING. THIS VEHICLE HAS BEEN REPORTED STOLEN AND IS UNDER ACTIVE PURSUIT. PULL OVER IMMEDIATELY."
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(msg); u.rate=0.85; u.pitch=0.8; u.volume=1; u.lang='en-GB'
      window.speechSynthesis.speak(u)
      setTimeout(() => window.speechSynthesis.speak(new SpeechSynthesisUtterance(msg)), 5000)
    }
    return { executed: true }
  },
  AUDIO_SIREN: async () => {
    const ctx = new (window.AudioContext||window.webkitAudioContext)()
    const osc = ctx.createOscillator(); const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination); gain.gain.value = 0.8
    osc.type='sawtooth'; osc.frequency.setValueAtTime(440,ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880,ctx.currentTime+0.5)
    osc.start(); osc.stop(ctx.currentTime+30)
    return { executed: true }
  },
  ALARM_ACTIVATE: async () => {
    let n = 0; const f = setInterval(() => {
      document.body.style.background = n%2===0 ? '#ff0000' : '#0000ff'; n++
      if (n>60) { clearInterval(f); document.body.style.background='' }
    }, 200)
    return { executed: true }
  },
  HAZARDS_ON: async () => {
    let n = 0; const f = setInterval(() => {
      document.body.style.background = n%2===0 ? '#ff6600' : '#0a0e1a'; n++
      if (n>120) { clearInterval(f); document.body.style.background='' }
    }, 500)
    return { executed: true }
  },
  DEACTIVATE_ALL: async () => { window.speechSynthesis?.cancel(); document.body.style.background=''; return { executed:true } },
  LOCK_DOORS:         async () => ({ hardware:true, obd_command:'AT_DOOR_LOCK_ALL' }),
  LOCK_WINDOWS:       async () => ({ hardware:true, obd_command:'AT_WINDOW_LOCK_ALL' }),
  ENGINE_THROTTLE_50: async () => ({ hardware:true, obd_command:'AT_THROTTLE_50' }),
  ENGINE_THROTTLE_25: async () => ({ hardware:true, obd_command:'AT_THROTTLE_25' }),
  ENGINE_CUT:         async () => ({ hardware:true, obd_command:'AT_ENGINE_CUT' }),
  SAFE_STEER_INITIATE:async () => ({ hardware:true, obd_command:'AT_SAFE_STEER' }),
}
 
export function useCommandListener(user, vehicles, isDemo) {
  const channelRef = useRef(null)
 
  useEffect(() => {
    if (isDemo || !user?.id || !vehicles?.length) return
    const myIds = vehicles.map(v => v.id)
 
    channelRef.current = supabase.channel(`cmds-${user.id}`)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'vehicle_commands' },
        async (payload) => {
          const cmd = payload.new
          if (!myIds.includes(cmd.vehicle_id)) return
          if (new Date(cmd.expires_at) < new Date()) {
            await supabase.from('vehicle_commands').update({ status:'rejected', error:'Expired' }).eq('id', cmd.id).catch(()=>{})
            return
          }
          await supabase.from('vehicle_commands').update({ status:'executing', delivered_at:new Date().toISOString() }).eq('id', cmd.id).catch(()=>{})
          const exec = COMMANDS[cmd.command]
          if (exec) {
            try {
              const result = await exec(cmd.payload||{})
              await supabase.from('vehicle_commands').update({ status:'executed', executed_at:new Date().toISOString() }).eq('id', cmd.id).catch(()=>{})
            } catch(e) {
              await supabase.from('vehicle_commands').update({ status:'failed', error:e.message }).eq('id', cmd.id).catch(()=>{})
            }
          }
        })
      .subscribe()
 
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [user?.id, vehicles?.length, isDemo])
}
