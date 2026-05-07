# LFG-Website

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Testing](#testing)
- [Coverage](#coverage)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Overview
LFG-Website is a real-time gaming community platform that helps players find groups to play games with. Users can browse games, create or join groups with custom join requirements, manage friends, and communicate via group chat or direct messages.

## Tech Stack
- **Frontend:** React, Vite, React Router
- **Backend:** Express.js, Node.js
- **Real-Time:** Socket.IO
- **Database:** MongoDB Atlas, Mongoose
- **Testing:** Cypress (76 E2E tests)
- **Deployment:** Vercel (frontend), Railway (backend)
- **Security:** JWT + httpOnly cookies, bcrypt password hashing
- **Accessibility:** WCAG 2.4.1 compliant, keyboard navigation, screen reader support

## Features
- Browse and filter games by search, tags, and sorting
- Create groups with role-based join requirements (auto-join, password-protected, request-based)
- Friend system with incoming/outgoing request tracking
- Real-time group chat and direct messaging between friends
- User authentication with JWT and secure cookies
- Profile management with bio, platforms, play style
- Password-protected account (change/delete)
- Calendar for local event planning
- Cookie consent banner
- Full keyboard navigation and screen reader support

## Installation
```bash
npm install
```

## Usage
**Development:**
```bash
npm run dev
```
Runs on `http://localhost:3000` with Vite dev server and Express API

**Production Build:**
```bash
npm run build
```

## Testing
```bash
npm test
```
Runs 76 Cypress E2E tests across 13 pages with cy.intercept mocking

## Coverage
Statement: 96.71% | Functions: 99.84% | Branches: 79.11%

Run coverage:
```bash
npm test -- --no-exit
```

## Project Structure
```
src/               Frontend React application
├── pages/         Page components (Games, Groups, Friends, etc.)
├── lib/           Utilities (API wrapper, Socket.IO, hooks)
└── components/    Reusable UI components

routes/            Express API endpoints (/auth, /games, /groups, /settings)
models/            Mongoose schemas (User, Group, Game)
utils/             Token generation and validation
cypress/           E2E test specs
```
