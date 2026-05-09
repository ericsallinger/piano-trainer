export interface HeaderProps {
  deviceNames: string[]
  selectedDeviceId: string | null
  onSelectDevice: (id: string) => void
  status: 'connected' | 'disconnected' | 'denied' | 'pending'
  selectedDeviceName: string | null
}

export function Header({
  deviceNames,
  selectedDeviceId,
  onSelectDevice,
  status,
  selectedDeviceName,
}: HeaderProps) {
  let statusText = ''
  if (status === 'pending') statusText = 'Requesting MIDI access...'
  else if (status === 'denied') statusText = 'MIDI permission denied — re-grant in browser settings'
  else if (status === 'disconnected' || !selectedDeviceName) statusText = 'No MIDI device'
  else statusText = `Connected: ${selectedDeviceName}`

  return (
    <header className="app-header">
      <h1>Piano Trainer</h1>
      <div className="midi-status">
        <span className={`status-dot status-${status}`} />
        <span>{statusText}</span>
        {deviceNames.length > 1 && (
          <select
            value={selectedDeviceId ?? ''}
            onChange={(e) => onSelectDevice(e.target.value)}
            aria-label="MIDI device"
          >
            {deviceNames.map((name, i) => (
              <option key={i} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>
    </header>
  )
}
