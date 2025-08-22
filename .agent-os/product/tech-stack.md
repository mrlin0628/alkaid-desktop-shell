# Technical Stack

> Last Updated: 2025-08-22
> Version: 1.0.0

## Application Framework

- **Framework:** SvelteKit
- **Version:** 2.0+

## Database

- **Primary Database:** SQLite

## JavaScript

- **Framework:** Svelte 5

## Import Strategy

- **Strategy:** ["importmaps", "node"]

## CSS Framework

- **Framework:** Tailwind CSS
- **Version:** 3.4+

## UI Component Library

- **Library:** shadcn-svelte

## Fonts Provider

- **Provider:** Google Fonts

## Icon Library

- **Library:** Lucide

## Application Hosting

- **Hosting:** Self-hosted on NAS (Docker containers)

## Database Hosting

- **Hosting:** Local SQLite files on NAS storage

## Asset Hosting

- **Hosting:** NAS static file serving

## Deployment Solution

- **Solution:** Docker Compose with automated builds

## Code Repository

- **Repository URL:** https://github.com/[username]/cyberpunk-dashboard

## Additional Stack Details

### Development Tools
- **Package Manager:** pnpm
- **Build Tool:** Vite (included with SvelteKit)
- **Type Safety:** TypeScript

### UI/UX Enhancements
- **Animations:** Framer Motion for Svelte
- **Color Palette:** Custom cyberpunk theme with neon accents
- **Background System:** Dynamic WebGL/Canvas backgrounds
- **Layout System:** CSS Grid + Flexbox for desktop-like interface

### NAS Integration
- **Container Runtime:** Docker
- **Reverse Proxy:** Traefik or Nginx Proxy Manager
- **File Management:** NAS native file system integration
- **Backup Strategy:** Automated SQLite backups to NAS storage

### Performance Optimizations
- **Image Handling:** Sharp for dynamic image processing
- **Caching:** Service Worker + HTTP caching
- **Bundle Splitting:** Automatic code splitting via SvelteKit
- **Progressive Enhancement:** SSR with client-side hydration