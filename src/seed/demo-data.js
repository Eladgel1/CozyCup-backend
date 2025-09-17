export const menuItems = [
  { name: 'Espresso', category: 'coffee', priceCents: 800, isAvailable: true },
  { name: 'Cappuccino', category: 'coffee', priceCents: 1200, isAvailable: true },
  { name: 'Latte', category: 'coffee', priceCents: 1300, isAvailable: true },
  { name: 'Flat White', category: 'coffee', priceCents: 1250, isAvailable: true },
  { name: 'Americano', category: 'coffee', priceCents: 1000, isAvailable: true },
  { name: 'Mocha', category: 'coffee', priceCents: 1400, isAvailable: true },
  { name: 'Iced Latte', category: 'cold', priceCents: 1350, isAvailable: true },
  { name: 'Iced Americano', category: 'cold', priceCents: 1100, isAvailable: true },
];

export const pickupWindows = (() => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return [
    {
      startAt: new Date(today.setHours(8, 0)),
      endAt: new Date(today.setHours(10, 0)),
      capacity: 10,
    },
    {
      startAt: new Date(today.setHours(10, 0)),
      endAt: new Date(today.setHours(12, 0)),
      capacity: 10,
    },
    {
      startAt: new Date(today.setHours(12, 0)),
      endAt: new Date(today.setHours(14, 0)),
      capacity: 10,
    },
    {
      startAt: new Date(today.setHours(14, 0)),
      endAt: new Date(today.setHours(16, 0)),
      capacity: 10,
    },
  ];
})();

export const slots = (() => {
  const base = new Date();
  return Array.from({ length: 6 }).map((_, i) => {
    const start = new Date(base.getTime() + i * 60 * 60 * 1000);
    return {
      startAt: start,
      endAt: new Date(start.getTime() + 45 * 60 * 1000),
      capacity: 5,
      status: 'open',
      isActive: true,
      bookedCount: 0,
    };
  });
})();

export const packages = [
  { name: 'Coffee Lover', credits: 10, price: 90 },
  { name: 'Heavy Drinker', credits: 20, price: 160 },
];

export const users = [
  { email: 'host@example.com', password: 'P@ssword123', role: 'host' },
  { email: 'cust1@example.com', password: 'P@ssword123', role: 'customer' },
  { email: 'cust2@example.com', password: 'P@ssword123', role: 'customer' },
];
