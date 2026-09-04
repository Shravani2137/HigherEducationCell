# HEC Tool

## Shared Setup For Multiple Laptops

The application must use one central backend and one central MySQL database if all laptops should see the same students, uploads, admin changes, and Excel data. Cloning the repository onto four laptops creates four separate local databases when `DB_HOST=localhost` is used.

Run the backend on one server or deploy it to a shared host. On every laptop's client environment, set:

```env
VITE_API_URL=https://your-hec-server.example.com/api
```

For a local network, use the backend computer's LAN address instead, for example `http://192.168.1.20:5000/api`. Do not use `localhost` on the other laptops because that points back to each laptop itself.

Configure the central backend with one shared MySQL database:

```env
DB_HOST=your-central-database-host
DB_PORT=3306
DB_NAME=hec_tool
DB_USER=hec_app
DB_PASSWORD=strong-password
```

Configure Google Drive on that central backend with one service account and one shared parent folder. The same service-account JSON key can technically be copied to all laptops, but it is not recommended: anyone with the key can access the Drive resources. Keep the key only on the central backend and let every laptop use the backend API.

The master workbook is regenerated after submissions and status changes and updated in the configured Google Drive folder. All admins viewing the shared backend will read the same database and therefore see the same current data.

## Local Development

Start the backend with `node server/index.js`, then run the client with `npm run dev` from the `client` directory.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
