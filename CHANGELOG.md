# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses semantic versioning once public releases begin.

## [Unreleased]

### Added

- M1.1: player movement with acceleration, friction, variable jump, jump cut, coyote time, jump buffering, and one-way platform drop-through.
- M1.1: `LevelScene` with a provisional JSON level format, validation, camera follow, and level bounds.
- M1.1: movement test level, parallax-free cave placeholder art, props, and loading progress.
- M1.1: title screen Start Run transitions into the level.
- M1.1: buffered keyboard input so fast taps are not eaten.
- M1.1: unit tests for level validation and an end-to-end movement/jump/drop-through test.

### Added (M1.2)

- M1.2: rock throwing with horizontal/up/down aim, cooldown, arcs, one bounce, and cleanup.
- M1.2: practice dummy enemy with three HP, hit flash, HP pips, and death feedback.
- M1.2: player damage with knockback, invulnerability blink, hearts, and camera feedback.
- M1.2: death and automatic retry flow (level restarts in under two seconds).
- M1.2: `HudScene` with hearts, infinite-rock indicator, level name, and death overlay.
- M1.2: level gap and kill plane for fall deaths; two practice dummies in the test level.
- M1.2: end-to-end tests for rock combat and death/retry.

### Planned

- M1: debug overlay, placeholder SFX, and playtest notes.

## [0.0.1] - 2026-10-19

### Added

- Initial Vite + TypeScript + Phaser 4 project scaffold.
- Boot, Preload, and keyboard-navigable Title scenes with placeholder art.
- Versioned local save service with settings, achievements, skins, and stats foundations.
- Unit tests for save parsing, backup/recovery, persistence, and unlocks.
- Playwright smoke test for boot and title-screen navigation.
- ESLint, Prettier, strict TypeScript, Vitest, and Playwright configuration.
- GitHub Actions CI and GitHub Pages deployment workflows.
- Project documentation: game design, technical plan, and roadmap.
