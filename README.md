# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Authentication Setup (Login / Signup)

The frontend auth client uses:

- `VITE_API_BASE_URL` when provided
- otherwise `/api` by default

### Local development

1. Start backend on port `5000`:

```bash
cd backend
npm install
npm run db:init
npm start
```

2. Start frontend dev server:

```bash
cd front
npm install
npm run dev
```

Vite proxy forwards `/api/*` to `http://localhost:5000` in development.

### Production / deployed frontend

Set `VITE_API_BASE_URL` in your frontend environment to your backend base URL, for example:

```bash
VITE_API_BASE_URL=https://your-backend-domain.com/api
```

Backend supports both root auth routes and `/api` auth routes (`/signup` and `/api/signup`, etc.) for compatibility.

## Checkout Email Setup (EmailJS)

The checkout form can send customer details directly to your Gmail using EmailJS.

1. Create an EmailJS account and connect Gmail as your email service.
2. Create one EmailJS template and include these variables in the template body:
	- `{{to_email}}`
	- `{{customer_name}}`
	- `{{customer_first_name}}`
	- `{{customer_last_name}}`
	- `{{customer_email}}`
	- `{{customer_phone}}`
	- `{{customer_alternate_phone}}`
	- `{{customer_address}}`
	- `{{customer_nearby_location}}`
	- `{{customer_city}}`
	- `{{customer_district}}`
	- `{{customer_state}}`
	- `{{customer_pincode}}`
	- `{{cart_items}}`
	- `{{item_count}}`
	- `{{subtotal_amount}}`
	- `{{shipping_amount}}`
	- `{{total_amount}}`
	- `{{customer_details}}`
	- `{{order_details}}`
	- `{{full_details}}`
	- `{{message}}`
	- `{{submitted_at}}`
3. In `front`, create a `.env.local` file from `.env.example` and fill values:

```bash
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

4. Restart Vite dev server after adding env values.

Recipient email is configured in checkout page as `madeticharanteja19@gmail.com`.
