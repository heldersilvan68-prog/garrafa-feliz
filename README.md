# Sistema De Venda Para Distribuidoras 2.0

Create a modern, clean, and responsive ERP Web Dashboard in Portuguese (PT-BR) for a beverage and mineral water distribution company. 

Initial Scope (Module 1 - Inventory & Products):

1. Layout: Sidebar navigation with a dark/light clean professional theme.

2. Product Management (CRUD):

   - Fields: Name, Category (e.g., Galão 20L, 500ml, Água Mineral, Cerveja), Cost Price, Selling Price, Minimum Stock level.

   - Special Returnable Container Logic: A toggle or badge for "Retornável" (Returnable). Track two distinct sub-stocks for returnable items: "Estoque Cheio" (Full Bottles) and "Estoque Vazio" (Empty Bottles in warehouse).

3. Inventory Dashboard:

   - Visual cards showing Total Full Inventory Value, Alert for Low Stock, Total Empty Bottles in Warehouse.

   - Quick action buttons to add stock (Entrada de Estoque) and move empty bottles.

4. Use Tailwind CSS, Lucide React icons, and Shadcn UI components for a top-tier aesthetic.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://garrafa-feliz.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/14d6ac54-c1a6-411c-a83b-3bf7552f22c0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
