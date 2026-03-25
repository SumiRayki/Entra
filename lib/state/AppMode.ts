// Entra only supports remote API mode
// This module is kept for compatibility with existing code that references appMode

export const useAppModeStore = {
    getState: () => ({
        appMode: 'remote' as const,
        setAppMode: () => {},
    }),
}

export const useAppMode = () => {
    return {
        appMode: 'remote' as const,
        setAppMode: () => {},
    }
}
