# Task 6: Analytics Dashboard Page

## What was done
Created `/home/z/my-project/src/app/agence/analytics/page.tsx` - a comprehensive, production-ready analytics dashboard for SmarticketS.

## Features implemented
1. **Header** with title "Analytics" and period selector (Aujourd'hui / Cette semaine / Ce mois) using shadcn Select
2. **4 KPI Cards** in responsive grid (2x2 mobile, 4 cols desktop):
   - Total Ventes (Ticket icon, emerald)
   - Revenus (DollarSign icon, amber)
   - Occupation moy. (Bus icon, cyan)
   - Colis livres (PackageCheck icon, rose)
3. **Sales Over Time Line Chart** - Multi-series (parcel=orange, ticket=blue, hajj=purple) using recharts LineChart inside ChartContainer
4. **Top Destinations Bar Chart** - Horizontal bar chart with gradient colors using recharts BarChart
5. **Occupancy Table** - Professional table with route, line, seats, progress bar for occupancy, status badge
6. **Additional Metrics Row** - 4 small cards: Avg Delivery Time, Recurrence Rate, Active Now, Total Passengers
7. **Top Routes** - Ranked list with gradient progress bars
8. **Auto-refresh** every 5 minutes (300000ms)
9. **Loading skeleton** state with animated skeletons
10. **Error handling** with retry button
11. **Empty state** for when no data is available

## Technical details
- 'use client' directive
- React state for period and data management
- useEffect for fetching + auto-refresh
- shadcn Card, Select, Badge, Skeleton, Progress, Table components
- ChartContainer from '@/components/ui/chart' for all charts
- useAgency() from '@/app/agence/layout' for agencyId
- Mobile-first responsive design
- Pink accent (#FF1D8D) SmarticketS theme
- No emoji in code
- French labels throughout
- Proper TypeScript typing

## Verification
- ESLint passes (only pre-existing error in scripts/migrate-db.js)
- Dev server compiles without errors
