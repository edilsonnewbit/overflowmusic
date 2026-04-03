# Mobile App (Expo)

## Scripts
- `npm run start:mobile`
- `npm --workspace apps/mobile run android`
- `npm --workspace apps/mobile run ios`

## Variáveis
Use no ambiente local (ex.: `.env` carregado pelo Expo CLI):
- `EXPO_PUBLIC_API_URL=https://music.overflowmvmt.com/api`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID=` (fallback único de OAuth client)
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=`
- `EXPO_PUBLIC_ADMIN_API_KEY=` (opcional, fallback para operações de cifra em ambiente de bootstrap)
- `EXPO_PUBLIC_MOBILE_LOGIN_FALLBACK_ENABLED=false` (habilita fallback manual de login)

## Escopo atual
- Login Google nativo (AuthSession) + fallback bootstrap controlado por flag/dev
- Sessão local via `AsyncStorage`
- Leitura de templates e checklist por evento
- Atualização de itens de checklist (`PATCH item`) com token de usuário autorizado
- Feedback visual de carregamento durante atualização de checklist (por item)
- Preview de cifra `.txt` com token de usuário autorizado (`LEADER|ADMIN|SUPER_ADMIN`) ou `EXPO_PUBLIC_ADMIN_API_KEY` (fallback)
- Import persistente de cifra `.txt` (`POST /songs/import/txt`) com token autorizado
- Seleção de arquivo `.txt` no dispositivo para preencher conteúdo automaticamente
