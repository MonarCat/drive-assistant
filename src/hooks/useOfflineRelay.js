import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

// This hook runs on EVERY D.A vehicle
// If there's a queued command for a nearby vehicle (detected via BT/WiFi)
// this vehicle relays it directly via Web Bluetooth

export function useOfflineRelay(user, vehicles, posRef, isDemo) {
  const intervalRef = useRef(null)

  useEffect(() => {
    if (isDemo || !user?.id || !vehicles?.length) return

    // Check for relayable commands every 60 seconds
    intervalRef.current = setInterval(checkAndRelay, 60000)

    return () => clearInterval(intervalRef.current)
  }, [user?.id, vehicles?.length, isDemo])

  async function checkAndRelay() {
    try {
      // Get all queued offline commands
      const { data: queue } = await supabase
        .from('offline_command_queue')
        .select('*')
        .eq('status', 'queued')
        .gt('expires_at', new Date().toISOString())
        .lt('relay_attempts', 5) // don't keep retrying forever

      if (!queue?.length) return

      // For each queued command, check if we can reach the target
      // via Web Bluetooth (if target is in range)
      for (const cmd of queue) {
        await attemptRelay(cmd)
      }
    } catch {}
  }

  async function attemptRelay(cmd) {
    if (!navigator.bluetooth) return

    const btAvailable = await navigator.bluetooth.getAvailability().catch(() => false)
    if (!btAvailable) return

    // Get target vehicle fingerprint
    const { data: fp } = await supabase
      .from('vehicle_fingerprints')
      .select('bt_name, bt_service_uuid, obd_serial')
      .eq('vehicle_id', cmd.vehicle_id)
      .single()

    if (!fp?.bt_name && !fp?.obd_serial) return

    // Update relay attempt count
    await supabase.from('offline_command_queue')
      .update({
        relay_attempts: (cmd.relay_attempts || 0) + 1,
        last_relay_by: vehicles[0]?.id,
      })
      .eq('id', cmd.id)

    // If we have a BT service UUID, try to connect to target's OBD dongle
    // and write the command directly
    if (fp.bt_service_uuid) {
      try {
        const device = await navigator.bluetooth.requestDevice({
          filters: [{ services: [fp.bt_service_uuid] }],
        }).catch(() => null)

        if (device?.gatt) {
          const server  = await device.gatt.connect()
          const service = await server.getPrimaryService(fp.bt_service_uuid)
          const chars   = await service.getCharacteristics()

          // Find writable characteristic
          for (const char of chars) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              const encoder = new TextEncoder()
              // Write command as JSON to OBD characteristic
              await char.writeValue(encoder.encode(JSON.stringify({
                cmd:   cmd.command,
                pid:   cmd.payload,
                src:   'DA_RELAY',
                relay: vehicles[0]?.plate,
              })))

              // Mark as relayed
              await supabase.from('offline_command_queue')
                .update({ status: 'relayed' })
                .eq('id', cmd.id)

              console.log(`[DA-RELAY] Command ${cmd.command} relayed to target via BT`)
              server.disconnect()
              return
            }
          }
          server.disconnect()
        }
      } catch {}
    }
  }
}
