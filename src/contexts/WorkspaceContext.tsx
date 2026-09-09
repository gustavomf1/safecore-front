import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Empresa, Estabelecimento } from '../types'

interface WorkspaceContextData {
  empresa: Empresa | null
  estabelecimento: Estabelecimento | null
  empresaFilha: Empresa | null
  selecionado: boolean
  selecionarEmpresa: (empresa: Empresa) => void
  selecionarEstabelecimento: (estabelecimento: Estabelecimento) => void
  selecionarEmpresaFilha: (empresa: Empresa) => void
  limpar: () => void
}

const WorkspaceContext = createContext<WorkspaceContextData>({} as WorkspaceContextData)

function loadFromStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [empresa, setEmpresa] = useState<Empresa | null>(() => loadFromStorage('engseg_empresa'))
  const [estabelecimento, setEstabelecimento] = useState<Estabelecimento | null>(() => loadFromStorage('engseg_estabelecimento'))
  const [empresaFilha, setEmpresaFilha] = useState<Empresa | null>(() => loadFromStorage('engseg_empresa_filha'))

  const selecionarEmpresa = useCallback((emp: Empresa) => {
    localStorage.setItem('engseg_empresa', JSON.stringify(emp))
    localStorage.removeItem('engseg_estabelecimento')
    localStorage.removeItem('engseg_empresa_filha')
    setEmpresa(emp)
    setEstabelecimento(null)
    setEmpresaFilha(null)
  }, [])

  const selecionarEstabelecimento = useCallback((est: Estabelecimento) => {
    localStorage.setItem('engseg_estabelecimento', JSON.stringify(est))
    localStorage.removeItem('engseg_empresa_filha')
    setEstabelecimento(est)
    setEmpresaFilha(null)
  }, [])

  const selecionarEmpresaFilha = useCallback((emp: Empresa) => {
    localStorage.setItem('engseg_empresa_filha', JSON.stringify(emp))
    setEmpresaFilha(emp)
  }, [])

  const limpar = useCallback(() => {
    localStorage.removeItem('engseg_empresa')
    localStorage.removeItem('engseg_estabelecimento')
    localStorage.removeItem('engseg_empresa_filha')
    setEmpresa(null)
    setEstabelecimento(null)
    setEmpresaFilha(null)
  }, [])

  const selecionado = !!empresa && !!estabelecimento && !!empresaFilha

  return (
    <WorkspaceContext.Provider value={{ empresa, estabelecimento, empresaFilha, selecionado, selecionarEmpresa, selecionarEstabelecimento, selecionarEmpresaFilha, limpar }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

// Separar useWorkspace exigiria atualizar import em ~11 arquivos pra um ganho só de Fast Refresh
// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace() {
  return useContext(WorkspaceContext)
}
