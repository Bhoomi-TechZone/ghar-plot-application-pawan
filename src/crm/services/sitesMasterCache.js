/**
 * Global Master Data Cache for Site Management
 * 
 * Production-grade caching layer for reference datasets:
 * - Business Associates (Employees)
 * - Clients
 * - Projects
 * - Expense Categories
 * 
 * Prevents redundant API calls on every screen switch or dropdown render.
 * Automatically invalidated when new entities are added or edited.
 */

import * as adminSitesApi from './adminSitesApi';

let cache = {
  clients: null,
  employees: null,
  categories: null,
  projects: null,
  isLoaded: false,
  lastFetched: 0,
};

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes in memory

/**
 * Fetch or get cached master reference data
 */
export const getMasterData = async (forceRefresh = false) => {
  const now = Date.now();
  const isFresh = cache.isLoaded && (now - cache.lastFetched < CACHE_TTL_MS);

  if (!forceRefresh && isFresh && cache.clients && cache.employees && cache.projects) {
    return {
      clients: cache.clients,
      employees: cache.employees,
      categories: cache.categories || [],
      projects: cache.projects,
    };
  }

  try {
    const [clientsRes, employeesRes, categoriesRes, projectsRes] = await Promise.allSettled([
      adminSitesApi.getClients(),
      adminSitesApi.getEmployees(),
      adminSitesApi.getExpenseCategories(),
      adminSitesApi.getProjects(),
    ]);

    if (clientsRes.status === 'fulfilled' && Array.isArray(clientsRes.value)) {
      cache.clients = clientsRes.value.map(c => ({
        id: c._id || c.id,
        name: c.name || '',
        contactNumber: c.contactNumber || '',
        comments: c.comments || '',
        source: c.source || '',
        clientType: c.clientType?.name || (typeof c.clientType === 'string' ? c.clientType : ''),
        status: c.status || 'Active',
        assignedTo: c.assignedTo,
        propertySellerType: c.propertySellerType,
        isRegisteredUser: !!c.isRegisteredUser,
      }));
    }

    if (employeesRes.status === 'fulfilled' && Array.isArray(employeesRes.value)) {
      cache.employees = employeesRes.value.map(e => ({
        id: e._id || e.id,
        name: e.name || '',
        email: e.email || '',
        phone: e.phone || '',
        department: e.department || '',
        role: e.role?.name || (typeof e.role === 'string' ? e.role : ''),
      }));
    }

    if (categoriesRes.status === 'fulfilled' && Array.isArray(categoriesRes.value) && categoriesRes.value.length > 0) {
      cache.categories = categoriesRes.value;
    }

    if (projectsRes.status === 'fulfilled' && Array.isArray(projectsRes.value)) {
      cache.projects = projectsRes.value.map(p => ({
        id: p._id || p.id,
        name: p.projectName || p.name || '',
        client: p.client?.name || (typeof p.client === 'string' ? p.client : '') || '',
        clientId: p.client?._id || (typeof p.client === 'string' ? p.client : ''),
        status: p.status || 'Active',
      }));
    }

    cache.isLoaded = true;
    cache.lastFetched = now;

    return {
      clients: cache.clients || [],
      employees: cache.employees || [],
      categories: cache.categories || [
        'Keele', 'Eat', 'Sariya', 'Kulhadi', 'Fabda',
        'Materials', 'Labor', 'Equipment', 'Utility', 'Others'
      ],
      projects: cache.projects || [],
    };
  } catch (error) {
    console.error('Error in getMasterData cache:', error);
    return {
      clients: cache.clients || [],
      employees: cache.employees || [],
      categories: cache.categories || [],
      projects: cache.projects || [],
    };
  }
};

/**
 * Synchronous getters for instant dropdown data
 */
export const getCachedClients = () => cache.clients || [];
export const getCachedEmployees = () => cache.employees || [];
export const getCachedProjects = () => cache.projects || [];
export const getCachedCategories = () => cache.categories || [];

/**
 * Cache mutation and invalidation helpers
 */
export const invalidateMasterCache = () => {
  cache.lastFetched = 0;
  cache.isLoaded = false;
};

export const updateCachedClients = (clients) => {
  cache.clients = clients;
};

export const updateCachedEmployees = (employees) => {
  cache.employees = employees;
};

export const updateCachedProjects = (projects) => {
  cache.projects = projects;
};

export const updateCachedCategories = (categories) => {
  cache.categories = categories;
};

export default {
  getMasterData,
  getCachedClients,
  getCachedEmployees,
  getCachedProjects,
  getCachedCategories,
  invalidateMasterCache,
  updateCachedClients,
  updateCachedEmployees,
  updateCachedProjects,
  updateCachedCategories,
};
