# Plan: Set up record-os.kevinhg.com

## Goal
Point `record-os.kevinhg.com` to Vercel deployment of recordOS

## Approach
Use Playwright browser automation for both Vercel and Squarespace

## Steps

### 1. Vercel: Add Custom Domain
- Navigate to vercel.com/dashboard
- Find record-os project → Settings → Domains
- Add `record-os.kevinhg.com`
- Note the CNAME target (likely `cname.vercel-dns.com`)

### 2. Squarespace: Add DNS Record
- Navigate to squarespace.com → Domains → kevinhg.com → DNS Settings
- Add CNAME record:
  - Host: `record-os`
  - Points to: `cname.vercel-dns.com`

### 3. Verify
- Wait for DNS propagation (5-60 min)
- Test https://record-os.kevinhg.com

### 4. Update Spotify (post-propagation)
- Add `https://record-os.kevinhg.com/callback` to Spotify Developer Dashboard redirect URIs

## Prerequisites
- ✅ Logged into Vercel
- ✅ Logged into Squarespace
