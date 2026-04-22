# Phone setup — blocking websites via NextDNS

One-time setup, ~3 minutes. Needed to make blocks added in the blockd dashboard actually work on your Android phone.

## Requirements

- Android phone (iOS has similar flow but this doc is for Android)
- NextDNS account (already have one — it's how we configured the API)

## Steps

### 1. Find your NextDNS Configuration ID

- Go to [my.nextdns.io](https://my.nextdns.io) → pick your profile
- The **Configuration ID** is shown at the top of the profile page (7-character alphanumeric, e.g. `ab12cd3`)
- **Important:** this is *not* the same as the API profile ID used by the backend

### 2. Install the NextDNS Android app

- Play Store: [NextDNS](https://play.google.com/store/apps/details?id=io.nextdns.app)

### 3. Connect the app to your profile

- Open the app → tap **Sign in** → same NextDNS account
- Select your profile (auto-selects if you only have one)
- Tap **Connect** / **Start**
- Android will prompt to allow the VPN connection — approve

### 4. Set as always-on VPN — the critical step

This is what prevents you from quietly disabling the block in a weak moment.

- Android Settings → **Network & Internet** → **VPN**
- Tap the gear icon ⚙️ next to **NextDNS**
- Enable **Always-on VPN**
- Enable **Block connections without VPN** ← this stops apps from bypassing the block when the VPN is disconnected

### 5. Test the block

- Open a browser on the phone
- Visit a domain you've added to the blocklist (e.g. `youtube.com`)
- Should fail with "This site can't be reached" or similar

### Notes on timing

NextDNS caches DNS responses. If the domain was loaded recently, the block can take a few minutes to take effect. Forcing it faster:

- Clear the browser's DNS cache, or
- Airplane mode on → off, or
- Restart the browser app
