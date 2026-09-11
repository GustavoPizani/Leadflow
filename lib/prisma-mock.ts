/* eslint-disable @typescript-eslint/no-explicit-any */
// In-memory mock store for Prisma in environments without an active PostgreSQL database.
// Allows Leadflow to run fully interactively in local/preview environments.

export interface MockStore {
  leadflowRoulette: any[];
  leadflowRouletteMember: any[];
  leadflowForm: any[];
  leadflowMetaConnection: any[];
  leadflowLead: any[];
  leadflowLocalUser: any[];
  leadflowAdminUser: any[];
  leadflowTeam: any[];
  leadflowTeamMember: any[];
  leadflowPushSubscription: any[];
}

function getInitialStore(): MockStore {
  const now = new Date();
  const adminId = 'admin-user-id';
  const managerId = 'manager-1';
  const broker1Id = 'broker-1';
  const broker2Id = 'broker-2';

  return {
    leadflowAdminUser: [
      { userId: adminId, createdAt: now },
    ],
    leadflowLocalUser: [
      { id: adminId, name: 'Administrador Leadflow', email: 'admin@leadflow.com', createdAt: now },
      { id: managerId, name: 'Carlos Gestor', email: 'carlos.gestor@exemplo.com', createdAt: now },
      { id: broker1Id, name: 'Ana Silva (Corretora)', email: 'ana.corretora@exemplo.com', createdAt: now },
      { id: broker2Id, name: 'Bruno Santos (Corretor)', email: 'bruno.corretor@exemplo.com', createdAt: now },
    ],
    leadflowTeam: [
      { id: 'team-1', name: 'Equipe Vendas Sul', managerId, createdAt: now },
    ],
    leadflowTeamMember: [
      { teamId: 'team-1', userId: broker1Id, createdAt: now },
      { teamId: 'team-1', userId: broker2Id, createdAt: now },
    ],
    leadflowRoulette: [
      {
        id: 'seed-roulette',
        name: 'Roleta Geral Imóveis',
        isActive: true,
        validFrom: null,
        validUntil: null,
        createdAt: now,
      },
    ],
    leadflowRouletteMember: [
      {
        rouletteId: 'seed-roulette',
        userId: broker1Id,
        lastAssignedAt: new Date(Date.now() - 3600000),
        createdAt: now,
      },
      {
        rouletteId: 'seed-roulette',
        userId: broker2Id,
        lastAssignedAt: null,
        createdAt: now,
      },
    ],
    leadflowForm: [
      {
        id: 'seed-form',
        name: 'Campanha Lançamento Alpha',
        source: 'manual',
        externalFormId: null,
        roletaId: 'seed-roulette',
        defaultUserId: broker1Id,
        isActive: true,
        webhookSecret: 'sec_test_1234567890abcdef',
        fieldMappings: {},
        metaConnectionId: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    leadflowMetaConnection: [],
    leadflowLead: [
      {
        id: 'lead-1',
        fullName: 'Mariana Costa',
        email: 'mariana.costa@email.com',
        phone: '+55 11 98765-4321',
        notes: 'Interesse em apto de 3 dormitórios',
        source: 'manual',
        rawPayload: {},
        formId: 'seed-form',
        assignedUserId: broker1Id,
        roletaId: 'seed-roulette',
        status: 'ASSIGNED',
        errorReason: null,
        createdAt: new Date(Date.now() - 7200000),
        assignedAt: new Date(Date.now() - 7100000),
      },
      {
        id: 'lead-2',
        fullName: 'Roberto Almeida',
        email: 'roberto.almeida@email.com',
        phone: '+55 11 91234-5678',
        notes: 'Solicitou contato via WhatsApp',
        source: 'manual',
        rawPayload: {},
        formId: 'seed-form',
        assignedUserId: broker2Id,
        roletaId: 'seed-roulette',
        status: 'ASSIGNED',
        errorReason: null,
        createdAt: new Date(Date.now() - 3600000),
        assignedAt: new Date(Date.now() - 3500000),
      },
      {
        id: 'lead-3',
        fullName: 'Fernanda Lima',
        email: 'fernanda.lima@email.com',
        phone: '+55 21 99887-6655',
        notes: 'Agendamento de visita no fim de semana',
        source: 'manual',
        rawPayload: {},
        formId: 'seed-form',
        assignedUserId: null,
        roletaId: 'seed-roulette',
        status: 'NEW',
        errorReason: null,
        createdAt: new Date(Date.now() - 600000),
        assignedAt: null,
      },
    ],
    leadflowPushSubscription: [],
  };
}

const globalMock = globalThis as unknown as { __leadflow_store?: MockStore };
if (!globalMock.__leadflow_store) {
  globalMock.__leadflow_store = getInitialStore();
}

function matchesWhere(item: any, where?: any): boolean {
  if (!where || typeof where !== 'object') return true;

  for (const [key, cond] of Object.entries(where)) {
    if (key === 'OR' && Array.isArray(cond)) {
      if (!cond.some((subWhere) => matchesWhere(item, subWhere))) return false;
      continue;
    }
    if (key === 'AND' && Array.isArray(cond)) {
      if (!cond.every((subWhere) => matchesWhere(item, subWhere))) return false;
      continue;
    }
    if (key === 'NOT') {
      if (matchesWhere(item, cond)) return false;
      continue;
    }

    const val = item[key];

    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('equals' in cond && val !== cond.equals) return false;
      if ('not' in cond) {
        if (cond.not === null && val === null) return false;
        if (cond.not !== null && val === cond.not) return false;
      }
      if ('in' in cond && Array.isArray(cond.in) && !cond.in.includes(val)) return false;
      if ('notIn' in cond && Array.isArray(cond.notIn) && cond.notIn.includes(val)) return false;
      if ('contains' in cond) {
        const needle = String(cond.contains).toLowerCase();
        const haystack = String(val ?? '').toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if ('gte' in cond && !(new Date(val as any) >= new Date((cond as any).gte))) return false;
      if ('lte' in cond && !(new Date(val as any) <= new Date((cond as any).lte))) return false;
      if ('gt' in cond && !(new Date(val as any) > new Date((cond as any).gt))) return false;
      if ('lt' in cond && !(new Date(val as any) < new Date((cond as any).lt))) return false;
      if ('some' in cond && Array.isArray(val)) {
        if (!val.some((subItem) => matchesWhere(subItem, cond.some))) return false;
      }
    } else {
      if (val !== cond) return false;
    }
  }

  return true;
}

function attachIncludes(modelName: string, item: any, include?: any, store?: MockStore): any {
  if (!include || !item || !store) return item;
  const enriched = { ...item };

  if (modelName === 'leadflowLead') {
    if (include.form) {
      const form = store.leadflowForm.find((f) => f.id === item.formId);
      enriched.form = form ? (include.form.select ? { name: form.name } : form) : null;
    }
    if (include.roulette) {
      const roulette = store.leadflowRoulette.find((r) => r.id === item.roletaId);
      enriched.roulette = roulette ? (include.roulette.select ? { name: roulette.name } : roulette) : null;
    }
  }

  if (modelName === 'leadflowRoulette') {
    if (include.members) {
      let members = store.leadflowRouletteMember.filter((m) => m.rouletteId === item.id);
      if (include.members.orderBy) {
        members = [...members].sort((a, b) => {
          const aTime = a.lastAssignedAt ? new Date(a.lastAssignedAt).getTime() : 0;
          const bTime = b.lastAssignedAt ? new Date(b.lastAssignedAt).getTime() : 0;
          return aTime - bTime;
        });
      }
      enriched.members = members;
    }
    if (include.forms) {
      enriched.forms = store.leadflowForm.filter((f) => f.roletaId === item.id);
    }
    if (include.leads) {
      enriched.leads = store.leadflowLead.filter((l) => l.roletaId === item.id);
    }
  }

  if (modelName === 'leadflowTeam') {
    if (include.members) {
      enriched.members = store.leadflowTeamMember.filter((m) => m.teamId === item.id);
    }
  }

  if (modelName === 'leadflowForm') {
    if (include.roulette) {
      const roulette = store.leadflowRoulette.find((r) => r.id === item.roletaId);
      enriched.roulette = roulette ? (include.roulette.select ? { name: roulette.name } : roulette) : null;
    }
    if (include.metaConnection) {
      const mc = store.leadflowMetaConnection.find((c) => c.id === item.metaConnectionId);
      enriched.metaConnection = mc ? (include.metaConnection.select ? { pageName: mc.pageName } : mc) : null;
    }
  }

  return enriched;
}

function createModelMock(modelName: keyof MockStore, store: MockStore) {
  return {
    async findMany(args: any = {}) {
      let items = (store[modelName] || []).filter((item) => matchesWhere(item, args.where));

      if (args.orderBy) {
        const orderRules = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
        for (const rule of orderRules) {
          const [field, direction] = Object.entries(rule)[0] as [string, 'asc' | 'desc'];
          items.sort((a, b) => {
            const aVal = a[field];
            const bVal = b[field];
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;
            if (aVal < bVal) return direction === 'desc' ? 1 : -1;
            if (aVal > bVal) return direction === 'desc' ? -1 : 1;
            return 0;
          });
        }
      }

      if (typeof args.take === 'number') {
        items = items.slice(0, args.take);
      }

      if (args.select) {
        items = items.map((item) => {
          const selected: any = {};
          for (const key of Object.keys(args.select)) {
            if (key === 'form' && modelName === 'leadflowLead') {
              const form = store.leadflowForm.find((f) => f.id === item.formId);
              selected.form = form ? { name: form.name } : null;
            } else if (key in item) {
              selected[key] = item[key];
            }
          }
          return selected;
        });
      } else if (args.include) {
        items = items.map((item) => attachIncludes(modelName, item, args.include, store));
      }

      return items;
    },

    async findUnique(args: any = {}) {
      const items = (store[modelName] || []).filter((item) => {
        if (!args.where) return false;
        if (args.where.teamId_userId) {
          return item.teamId === args.where.teamId_userId.teamId && item.userId === args.where.teamId_userId.userId;
        }
        if (args.where.rouletteId_userId) {
          return item.rouletteId === args.where.rouletteId_userId.rouletteId && item.userId === args.where.rouletteId_userId.userId;
        }
        return matchesWhere(item, args.where);
      });
      const item = items[0] ?? null;
      return attachIncludes(modelName, item, args.include, store);
    },

    async findFirst(args: any = {}) {
      const items = await this.findMany({ ...args, take: 1 });
      return items[0] ?? null;
    },

    async create(args: any = {}) {
      const newItem = {
        id: args.data?.id || `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data,
      };
      store[modelName].push(newItem);
      return attachIncludes(modelName, newItem, args.include, store);
    },

    async createMany(args: any = {}) {
      const items = (args.data || []).map((d: any) => ({
        id: d.id || `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...d,
      }));
      store[modelName].push(...items);
      return { count: items.length };
    },

    async update(args: any = {}) {
      const index = (store[modelName] || []).findIndex((item) => {
        if (!args.where) return false;
        if (args.where.teamId_userId) {
          return item.teamId === args.where.teamId_userId.teamId && item.userId === args.where.teamId_userId.userId;
        }
        return matchesWhere(item, args.where);
      });
      if (index === -1) {
        return this.create({ data: { ...args.where, ...args.data } });
      }
      store[modelName][index] = {
        ...store[modelName][index],
        ...args.data,
        updatedAt: new Date(),
      };
      return attachIncludes(modelName, store[modelName][index], args.include, store);
    },

    async updateMany(args: any = {}) {
      let count = 0;
      for (let i = 0; i < store[modelName].length; i++) {
        if (matchesWhere(store[modelName][i], args.where)) {
          store[modelName][i] = {
            ...store[modelName][i],
            ...args.data,
            updatedAt: new Date(),
          };
          count++;
        }
      }
      return { count };
    },

    async upsert(args: any = {}) {
      const existing = await this.findUnique({ where: args.where });
      if (existing) {
        return this.update({ where: args.where, data: args.update, include: args.include });
      } else {
        return this.create({ data: { ...args.where, ...args.create }, include: args.include });
      }
    },

    async delete(args: any = {}) {
      const index = (store[modelName] || []).findIndex((item) => {
        if (!args.where) return false;
        if (args.where.teamId_userId) {
          return item.teamId === args.where.teamId_userId.teamId && item.userId === args.where.teamId_userId.userId;
        }
        return matchesWhere(item, args.where);
      });
      if (index !== -1) {
        const [deleted] = store[modelName].splice(index, 1);
        return deleted;
      }
      return {};
    },

    async deleteMany(args: any = {}) {
      const before = store[modelName].length;
      store[modelName] = store[modelName].filter((item) => !matchesWhere(item, args?.where));
      return { count: before - store[modelName].length };
    },

    async count(args: any = {}) {
      return (store[modelName] || []).filter((item) => matchesWhere(item, args.where)).length;
    },

    async groupBy(args: any = {}) {
      const byFields: string[] = args.by || [];
      const groups = new Map<string, { key: any; count: number }>();

      for (const item of store[modelName]) {
        if (!matchesWhere(item, args.where)) continue;
        const keyParts = byFields.map((f) => String(item[f] ?? 'null'));
        const groupKey = keyParts.join(':::');
        const existing = groups.get(groupKey);
        if (existing) {
          existing.count++;
        } else {
          const keyObj: any = {};
          for (const f of byFields) {
            keyObj[f] = item[f];
          }
          groups.set(groupKey, { key: keyObj, count: 1 });
        }
      }

      return Array.from(groups.values()).map((g) => ({
        ...g.key,
        _count: g.count,
      }));
    },
  };
}

export function createPrismaMock() {
  const store = globalMock.__leadflow_store!;

  const modelMocks: Record<string, any> = {
    leadflowRoulette: createModelMock('leadflowRoulette', store),
    leadflowRouletteMember: createModelMock('leadflowRouletteMember', store),
    leadflowForm: createModelMock('leadflowForm', store),
    leadflowMetaConnection: createModelMock('leadflowMetaConnection', store),
    leadflowLead: createModelMock('leadflowLead', store),
    leadflowLocalUser: createModelMock('leadflowLocalUser', store),
    leadflowAdminUser: createModelMock('leadflowAdminUser', store),
    leadflowTeam: createModelMock('leadflowTeam', store),
    leadflowTeamMember: createModelMock('leadflowTeamMember', store),
    leadflowPushSubscription: createModelMock('leadflowPushSubscription', store),
  };

  const mockClient: any = new Proxy(
    {
      async $queryRaw(stringsOrSql: any, ...values: any[]) {
        const sql = Array.isArray(stringsOrSql) ? stringsOrSql.join('?') : String(stringsOrSql);

        // Roulette assignment query (CTE + UPDATE)
        if (sql.includes('leadflow_roulette_members') || sql.includes('WITH next_member')) {
          const rouletteId = values[0];
          const members = store.leadflowRouletteMember
            .filter((m) => !rouletteId || m.rouletteId === rouletteId)
            .sort((a, b) => {
              if (!a.lastAssignedAt && !b.lastAssignedAt) return 0;
              if (!a.lastAssignedAt) return -1;
              if (!b.lastAssignedAt) return 1;
              return new Date(a.lastAssignedAt).getTime() - new Date(b.lastAssignedAt).getTime();
            });

          if (members.length > 0) {
            const next = members[0];
            next.lastAssignedAt = new Date();
            return [{ userId: next.userId }];
          }
          return [];
        }

        // CRM Users query
        if (sql.includes('FROM users') || sql.includes('users')) {
          return [
            { id: 'admin-user-id', name: 'Administrador Leadflow', email: 'admin@leadflow.com', role: 'MARKETING_ADMIN', accountId: null },
            { id: 'crm-broker-1', name: 'Lucas Ferreira', email: 'lucas.ferreira@crm.com', role: 'BROKER', accountId: 'acc-1' },
            { id: 'broker-1', name: 'Ana Silva (Corretora)', email: 'ana.corretora@exemplo.com', role: 'BROKER', accountId: 'acc-1' },
            { id: 'broker-2', name: 'Bruno Santos (Corretor)', email: 'bruno.corretor@exemplo.com', role: 'BROKER', accountId: 'acc-1' },
          ];
        }

        return [];
      },

      async $executeRaw() {
        return 1;
      },

      async $transaction(actions: any) {
        if (typeof actions === 'function') {
          return actions(mockClient);
        }
        if (Array.isArray(actions)) {
          return Promise.all(actions);
        }
        return actions;
      },

      async $disconnect() {},
      async $connect() {},
    },
    {
      get(target, prop: string) {
        if (prop in target) return (target as any)[prop];
        if (prop in modelMocks) return modelMocks[prop];
        return {
          findMany: async () => [],
          findFirst: async () => null,
          findUnique: async () => null,
          create: async (d: any) => d?.data ?? {},
          update: async (d: any) => d?.data ?? {},
          delete: async () => ({}),
          deleteMany: async () => ({ count: 0 }),
          count: async () => 0,
        };
      },
    },
  );

  return mockClient;
}
