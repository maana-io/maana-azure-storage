require('dotenv').config()

export const resolver = {
  Query: {
    info: async () => {
      return {
        id: 'maana-azure-storage',
        name: 'maana-azure-storage',
        description:
          'Maana Q Knowledge Service wrapper for Azure Storage'
      }
    }
  }
}
