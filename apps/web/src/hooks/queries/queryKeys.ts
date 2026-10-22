const moduleKeys = (module: string) => ({
  all: () => [module] as const, // ['catalogs']
  list: (params?: object) => [module, 'list', params] as const, // ['catalogs', 'list', undefined]
  detail: (id: string | number) => [module, 'detail', id] as const, // ['catalogs', 'detail', '42']
});

export const queryKeys = {
  catalogs: moduleKeys('catalogs'),
  categories: moduleKeys('categories'),
  offerings: moduleKeys('offerings'),
  offeringPrices: moduleKeys('offeringPrices'),
  organizations: moduleKeys('organizations'),
  individuals: moduleKeys('individuals'),
  productInventory: moduleKeys('productInventory'),
  agreements: moduleKeys('agreements'),
  productOrders: moduleKeys('productOrders'),
  productSpecifications: moduleKeys('productSpecifications'),
  resourceSpecifications: moduleKeys('resourceSpecifications'),
  serviceSpecifications: moduleKeys('serviceSpecifications'),
  reviewComments: moduleKeys('reviewComments'),
  usages: moduleKeys('usages'),
  quotas: moduleKeys('quotas'),
  session: moduleKeys('session'),
};
