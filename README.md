# RaidMate

Карта для рейдов в Escape from Tarkov: выходы с фильтром по фракциям, этажи многоуровневых карт, время Таркова. Позиция игрока по скриншоту и автосмена карты по логу игры появятся вместе с виджетом для Xbox Game Bar и веб-версией — проект сейчас переделывается, релизов нет.

## Разработка

```bash
git clone --recurse-submodules https://github.com/Mosmain/raidmate.git
cd raidmate
pnpm install
pnpm dev
```

Устройство проекта, подводные камни сборки на Windows и релизы — в [CLAUDE.md](CLAUDE.md).

## Благодарности

- SVG-карты — [the-hideout/tarkov-dev-svg-maps](https://github.com/the-hideout/tarkov-dev-svg-maps) (CC BY-NC-SA 4.0), git-сабмодуль в `apps/client/public/maps/`
- Калибровка карт портирована из [the-hideout/tarkov-dev](https://github.com/the-hideout/tarkov-dev) (MIT)

Полная атрибуция — в [CREDITS.md](CREDITS.md). Лицензия — [LICENSE](./LICENSE).
