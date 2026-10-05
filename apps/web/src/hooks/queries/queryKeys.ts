const moduleKeys = (module: string) => ({
  all: () => [module] as const, // ['catalogs']
  list: (params?: object) => [module, 'list', params] as const, // ['catalogs', 'list', undefined]
  detail: (id: string | number) => [module, 'detail', id] as const, // ['catalogs', 'detail', '42']
});

export const queryKeys = {
  agreements: moduleKeys('agreements'),
  catalogs: moduleKeys('catalogs'),
  categories: moduleKeys('categories'),
  individuals: moduleKeys('individuals'),
  offeringPrices: moduleKeys('offeringPrices'),
  offerings: moduleKeys('offerings'),
  organizations: moduleKeys('organizations'),
  productInventory: moduleKeys('productInventory'),
  productOrders: moduleKeys('productOrders'),
  productSpecifications: moduleKeys('productSpecifications'),
  resourceSpecifications: moduleKeys('resourceSpecifications'),
  reviewComments: moduleKeys('reviewComments'),
  serviceSpecifications: moduleKeys('serviceSpecifications'),
  session: moduleKeys('session'),
  usages: moduleKeys('usages'),
};
