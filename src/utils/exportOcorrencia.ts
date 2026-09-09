import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { formatDate } from './date'
import { downloadEvidencia } from '../api/evidencia'
import type { Evidencia, Desvio, NaoConformidade } from '../types'

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number }
  }
}

interface NormaTrecho {
  id: string
  normaId: string
  clausulaReferencia?: string
  textoEditado: string
}

interface ExportOptions {
  ocorrencia: Desvio | NaoConformidade
  trechos?: NormaTrecho[]
  isDesvio: boolean
}

export const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp'])

export function getExt(nome: string) {
  const dot = nome.lastIndexOf('.')
  return dot >= 0 ? nome.substring(dot + 1).toLowerCase() : ''
}

function sanitize(name: string) {
  return (name || 'ocorrencia').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 60)
}

function buildFileName(o: ExportOptions, ext: 'pdf' | 'xlsx' | 'zip') {
  const prefix = o.isDesvio ? 'Desvio' : 'NaoConformidade'
  const titulo = sanitize(o.ocorrencia.titulo || o.ocorrencia.id)
  const date = new Date().toISOString().slice(0, 10)
  return `${prefix}_${titulo}_${date}.${ext}`
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function getImageDimensions(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = reject
    img.src = dataUrl
  })
}

export async function gifToDataUrl(blob: Blob): Promise<string> {
  const dataUrl = await blobToDataUrl(blob)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

export async function renderEvidenciasSection(doc: jsPDF, imagens: Evidencia[]): Promise<void> {
  if (imagens.length === 0) return

  const pageW = doc.internal.pageSize.getWidth()
  const marginX = 15
  const usableW = pageW - marginX * 2
  const maxImgH = 110
  const legendH = 6
  const gapH = 10

  doc.addPage()
  let y = 20
  let countOnPage = 0

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text('Evidências da Ocorrência', marginX, y)
  y += 10

  for (let i = 0; i < imagens.length; i++) {
    if (countOnPage === 2) {
      doc.addPage()
      y = 20
      countOnPage = 0
    }

    const ev = imagens[i]
    const ext = getExt(ev.nomeArquivo)

    try {
      const blob = await downloadEvidencia(ev.id)
      let dataUrl: string
      let format: string

      if (ext === 'gif') {
        dataUrl = await gifToDataUrl(blob)
        format = 'PNG'
      } else {
        dataUrl = await blobToDataUrl(blob)
        format = ext === 'png' ? 'PNG' : ext === 'webp' ? 'WEBP' : 'JPEG'
      }

      const { w: imgW, h: imgH } = await getImageDimensions(dataUrl)
      const scale = Math.min(usableW / imgW, maxImgH / imgH)
      const drawW = imgW * scale
      const drawH = imgH * scale
      const x = marginX + (usableW - drawW) / 2

      doc.addImage(dataUrl, format, x, y, drawW, drawH)
      y += drawH
    } catch {
      doc.setFillColor(241, 245, 249)
      doc.rect(marginX, y, usableW, 40, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text(
        `Arquivo indisponível — ${ev.nomeArquivo}`,
        marginX + usableW / 2,
        y + 22,
        { align: 'center' },
      )
      y += 40
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(`${i + 1}. ${ev.nomeArquivo}`, marginX, y + 5)
    y += legendH + gapH
    countOnPage++
  }
}

// ─────────────────────── PDF (interno) ────────────────────────────────────
async function buildPDFDoc(options: ExportOptions, imagens: Evidencia[]): Promise<jsPDF> {
  const { ocorrencia, trechos = [], isDesvio } = options
  const nc = !isDesvio ? (ocorrencia as NaoConformidade) : null
  const desvio = isDesvio ? (ocorrencia as Desvio) : null
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const marginX = 15
  let y = 18

  // Header bar
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('SGS — Sistema de Gestão de Segurança', marginX, 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(186, 230, 253)
  doc.text(isDesvio ? 'Relatório de Desvio' : 'Relatório de Não Conformidade', marginX, 22)
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(8)
  doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, pageW - marginX, 22, { align: 'right' })

  y = 38

  // Title
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  const tituloLines = doc.splitTextToSize(ocorrencia.titulo || '—', pageW - marginX * 2)
  doc.text(tituloLines, marginX, y)
  y += tituloLines.length * 6 + 2

  // Status + tags row
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  const tags: string[] = []
  tags.push(`Status: ${ocorrencia.status || 'CONCLUÍDO'}`)
  if (ocorrencia.regraDeOuro) tags.push('Regra de Ouro')
  if (!isDesvio && nc?.reincidencia) tags.push('Reincidência')
  if (!isDesvio && nc?.nivelRisco) tags.push(`Risco: ${nc.nivelRisco}`)
  doc.text(tags.join('  ·  '), marginX, y)
  y += 8

  // Info table
  const rows: [string, string][] = [
    ['Estabelecimento', ocorrencia.estabelecimentoNome || '—'],
    ['Localização', ocorrencia.localizacaoNome || '—'],
    ['Data de Registro', formatDate(ocorrencia.dataRegistro) || '—'],
    ['Registrado por', ocorrencia.usuarioCriacaoNome || ocorrencia.tecnicoNome || '—'],
  ]
  if (isDesvio) {
    rows.push(['Resp. pelo Desvio', desvio?.responsavelDesvioNome || '—'])
    rows.push(['Resp. pela Tratativa', desvio?.responsavelTrativaNome || '—'])
  }
  if (!isDesvio) {
    rows.push(['Data Limite', formatDate(nc?.dataLimiteResolucao) || '—'])
    rows.push(['Eng. Responsável pela Tratativa',
      nc?.responsavelTrativaNome
        ? `${nc.responsavelTrativaNome} (${nc.responsavelTrativaEmail ?? ''})`
        : nc?.responsavelTrativaEmail || '—'])
    rows.push(['Eng. Responsável pela NC',
      nc?.responsavelNcNome
        ? `${nc.responsavelNcNome} (${nc.responsavelNcEmail ?? ''})`
        : nc?.responsavelNcEmail || '—'])
  }

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['Campo', 'Valor']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [3, 105, 161], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold', textColor: [71, 85, 105] } },
  })
  y = doc.lastAutoTable.finalY + 8

  // Descrição
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text('Descrição', marginX, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(30, 41, 59)
  const descLines = doc.splitTextToSize(ocorrencia.descricao || '—', pageW - marginX * 2)
  if (y + descLines.length * 5 > 275) { doc.addPage(); y = 20 }
  doc.text(descLines, marginX, y)
  y += descLines.length * 5 + 6

  // Orientação Realizada (Desvio only)
  if (isDesvio && desvio?.orientacaoRealizada) {
    if (y > 250) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text('Orientação Realizada', marginX, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 41, 59)
    const orientLines = doc.splitTextToSize(desvio.orientacaoRealizada, pageW - marginX * 2)
    if (y + orientLines.length * 5 > 275) { doc.addPage(); y = 20 }
    doc.text(orientLines, marginX, y)
    y += orientLines.length * 5 + 6
  }

  // Normas (NC only)
  if (!isDesvio && nc?.normas && nc.normas.length > 0) {
    if (y > 250) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text('Normas Vinculadas', marginX, y)
    y += 3

    const normaRows: [string, string, string][] = []
    for (const n of nc.normas) {
      const ts = trechos.filter((t: NormaTrecho) => t.normaId === n.id)
      if (ts.length === 0) {
        normaRows.push([n.titulo, '—', '—'])
      } else {
        for (const t of ts) {
          normaRows.push([n.titulo, t.clausulaReferencia || '—', t.textoEditado])
        }
      }
    }

    autoTable(doc, {
      startY: y + 2,
      margin: { left: marginX, right: marginX },
      head: [['Norma', 'Cláusula', 'Trecho']],
      body: normaRows,
      theme: 'grid',
      headStyles: { fillColor: [3, 105, 161], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 30 } },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // Histórico de Tratativa (NC only)
  if (!isDesvio) {
    const hist: [string, string, string, string][] = []
    nc?.devolutivas?.forEach((d, i) => {
      hist.push([`Plano de Ação #${i + 1}`, d.descricaoPlanoAcao || '', d.engenheiroNome || '—', formatDate(d.dataDevolutiva)])
    })
    nc?.execucoes?.forEach((e, i) => {
      hist.push([`Execução #${i + 1}`, e.descricaoAcaoExecutada || '', e.engenheiroNome || '—', formatDate(e.dataExecucao)])
    })
    nc?.validacoes?.forEach((v, i) => {
      hist.push([
        `Validação #${i + 1} — ${v.parecer === 'APROVADO' ? 'Aprovada' : 'Reprovada'}`,
        v.observacao || '',
        v.engenheiroNome || '—',
        formatDate(v.dataValidacao),
      ])
    })

    if (hist.length > 0) {
      if (y > 240) { doc.addPage(); y = 20 }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(15, 23, 42)
      doc.text('Histórico da Tratativa', marginX, y)
      autoTable(doc, {
        startY: y + 3,
        margin: { left: marginX, right: marginX },
        head: [['Etapa', 'Detalhes', 'Responsável', 'Data']],
        body: hist,
        theme: 'grid',
        headStyles: { fillColor: [3, 105, 161], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { cellWidth: 35, fontStyle: 'bold' }, 2: { cellWidth: 35 }, 3: { cellWidth: 25 } },
      })
    }
  }

  // Seção de evidências (imagens embutidas, após histórico)
  await renderEvidenciasSection(doc, imagens)

  // Footer em todas as páginas
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`Página ${p} de ${totalPages}`, pageW - marginX, 290, { align: 'right' })
    doc.text('SafeCorp · SGS — Documento gerado automaticamente', marginX, 290)
  }

  return doc
}

// ───────────────────── PDF (público — mantido para compat.) ────────────────
export async function exportOcorrenciaToPDF(options: ExportOptions) {
  const doc = await buildPDFDoc(options, [])
  doc.save(buildFileName(options, 'pdf'))
}

// ─────────────────────── Bundle PDF ± ZIP ─────────────────────────────────
export async function exportOcorrenciaBundle(
  options: ExportOptions,
  evidencias: Evidencia[],
): Promise<void> {
  const imagens = evidencias.filter(e => IMAGE_EXTS.has(getExt(e.nomeArquivo)))
  const outros = evidencias.filter(e => !IMAGE_EXTS.has(getExt(e.nomeArquivo)))

  const doc = await buildPDFDoc(options, imagens)

  if (outros.length === 0) {
    doc.save(buildFileName(options, 'pdf'))
    return
  }

  const pdfBlob = doc.output('blob')
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  zip.file(buildFileName(options, 'pdf'), pdfBlob)

  const folder = zip.folder('anexos')!
  const usedNames = new Set<string>()

  for (const ev of outros) {
    try {
      const blob = await downloadEvidencia(ev.id)
      let name = ev.nomeArquivo
      if (usedNames.has(name)) {
        const dot = name.lastIndexOf('.')
        const base = dot >= 0 ? name.slice(0, dot) : name
        const ext = dot >= 0 ? name.slice(dot) : ''
        let n = 2
        while (usedNames.has(`${base}_${n}${ext}`)) n++
        name = `${base}_${n}${ext}`
      }
      usedNames.add(name)
      folder.file(name, blob)
    } catch {
      console.warn(`[exportOcorrencia] Falha ao baixar anexo ${ev.id} (${ev.nomeArquivo})`)
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = buildFileName(options, 'zip')
  a.click()
  URL.revokeObjectURL(url)
}

// ───────────────────────────── Excel ───────────────────────────────────────
export function exportOcorrenciaToExcel({ ocorrencia, trechos = [], isDesvio }: ExportOptions) {
  const wb = XLSX.utils.book_new()

  // Resumo
  const resumo: (string | number | null)[][] = [
    ['Campo', 'Valor'],
    ['Tipo', isDesvio ? 'Desvio' : 'Não Conformidade'],
    ['Título', ocorrencia.titulo || ''],
    ['Status', ocorrencia.status || 'CONCLUIDO'],
    ['Estabelecimento', ocorrencia.estabelecimentoNome || ''],
    ['Localização', ocorrencia.localizacaoNome || ''],
    ['Data de Registro', formatDate(ocorrencia.dataRegistro) || ''],
    ['Registrado por', ocorrencia.usuarioCriacaoNome || ocorrencia.tecnicoNome || ''],
    ['Descrição', ocorrencia.descricao || ''],
    ['Regra de Ouro', ocorrencia.regraDeOuro ? 'Sim' : 'Não'],
  ]
  if (isDesvio) {
    const desvio = ocorrencia as Desvio
    resumo.push(['Resp. pelo Desvio', desvio.responsavelDesvioNome || ''])
    resumo.push(['Resp. pela Tratativa', desvio.responsavelTrativaNome || ''])
    resumo.push(['Orientação Realizada', desvio.orientacaoRealizada || ''])
  }
  if (!isDesvio) {
    const nc = ocorrencia as NaoConformidade
    resumo.push(['Reincidência', nc.reincidencia ? 'Sim' : 'Não'])
    resumo.push(['Nível de Risco', nc.nivelRisco || ''])
    resumo.push(['Data Limite', formatDate(nc.dataLimiteResolucao) || ''])
    resumo.push(['Eng. Responsável pela Tratativa',
      nc.responsavelTrativaNome
        ? `${nc.responsavelTrativaNome} (${nc.responsavelTrativaEmail ?? ''})`
        : nc.responsavelTrativaEmail || ''])
    resumo.push(['Eng. Responsável pela NC',
      nc.responsavelNcNome
        ? `${nc.responsavelNcNome} (${nc.responsavelNcEmail ?? ''})`
        : nc.responsavelNcEmail || ''])
  }
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo)
  wsResumo['!cols'] = [{ wch: 28 }, { wch: 70 }]
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

  // Normas (NC only)
  if (!isDesvio && (ocorrencia as NaoConformidade).normas && (ocorrencia as NaoConformidade).normas.length > 0) {
    const normas: (string | null)[][] = [['Norma', 'Cláusula', 'Trecho']]
    for (const n of (ocorrencia as NaoConformidade).normas) {
      const ts = trechos.filter((t: NormaTrecho) => t.normaId === n.id)
      if (ts.length === 0) normas.push([n.titulo, '', ''])
      else for (const t of ts) normas.push([n.titulo, t.clausulaReferencia || '', t.textoEditado])
    }
    const wsNormas = XLSX.utils.aoa_to_sheet(normas)
    wsNormas['!cols'] = [{ wch: 24 }, { wch: 22 }, { wch: 70 }]
    XLSX.utils.book_append_sheet(wb, wsNormas, 'Normas')
  }

  // Histórico (NC only)
  if (!isDesvio) {
    const nc = ocorrencia as NaoConformidade
    const hist: (string | null)[][] = [['Etapa', 'Detalhes', 'Responsável', 'Data']]
    nc.devolutivas?.forEach((d, i) =>
      hist.push([`Plano de Ação #${i + 1}`, d.descricaoPlanoAcao || '', d.engenheiroNome || '', formatDate(d.dataDevolutiva)]))
    nc.execucoes?.forEach((e, i) =>
      hist.push([`Execução #${i + 1}`, e.descricaoAcaoExecutada || '', e.engenheiroNome || '', formatDate(e.dataExecucao)]))
    nc.validacoes?.forEach((v, i) =>
      hist.push([
        `Validação #${i + 1} — ${v.parecer === 'APROVADO' ? 'Aprovada' : 'Reprovada'}`,
        v.observacao || '',
        v.engenheiroNome || '',
        formatDate(v.dataValidacao),
      ]))
    if (hist.length > 1) {
      const wsHist = XLSX.utils.aoa_to_sheet(hist)
      wsHist['!cols'] = [{ wch: 28 }, { wch: 60 }, { wch: 30 }, { wch: 14 }]
      XLSX.utils.book_append_sheet(wb, wsHist, 'Tratativa')
    }
  }

  XLSX.writeFile(wb, buildFileName({ ocorrencia, trechos, isDesvio }, 'xlsx'))
}
