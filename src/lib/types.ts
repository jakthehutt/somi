export type BlocklistStatus = 'active' | 'pending_removal' | 'removed'
export type RequestStatus   = 'pending' | 'approved' | 'denied' | 'executed'
export type Role            = 'owner' | 'friend'

export interface Profile {
  id:         string
  role:       Role
  email:      string
  created_at: string
}

export interface BlocklistEntry {
  id:       string
  domain:   string
  added_at: string
  added_by: string
  status:   BlocklistStatus
}

export interface LockState {
  id:                number
  locked_until:      string | null
  cooling_off_hours: number
  updated_at:        string
}

export interface UnlockRequest {
  id:                  string
  target_blocklist_id: string | null
  target_lock_change:  { new_locked_until: string } | null
  requested_by:        string
  requested_at:        string
  reason:              string | null
  status:              RequestStatus
  approved_at:         string | null
  executed_at:         string | null
  friend_user_id:      string | null
}

export interface AuditEntry {
  id:         string
  actor:      string | null
  action:     string
  payload:    Record<string, unknown> | null
  created_at: string
}
