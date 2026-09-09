import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from './date'
import { getEvidencias, getEvidenciasAtividade, downloadEvidencia } from '../api/evidencia'
import {
  blobToDataUrl,
  getImageDimensions,
  gifToDataUrl,
  IMAGE_EXTS,
  getExt,
  renderEvidenciasSection,
} from './exportOcorrencia'
import type { NaoConformidade, Evidencia } from '../types'

export interface NormaTrecho {
  id: string
  normaId: string
  clausulaReferencia?: string
  textoEditado: string
}

function sanitize(name: string) {
  return (name || 'tratativa').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 60)
}

async function renderAtividadeImagens(
  doc: jsPDF,
  imagens: Evidencia[],
  y: number,
  pageW: number,
  marginX: number,
): Promise<number> {
  const usableW = pageW - marginX * 2
  const maxImgH = 90
  const legendH = 6
  const gapH = 6

  for (let i = 0; i < imagens.length; i++) {
    if (y > 245) { doc.addPage(); y = 20 }

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
      doc.rect(marginX, y, usableW, 28, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text(
        `Arquivo indisponível — ${ev.nomeArquivo}`,
        marginX + usableW / 2,
        y + 16,
        { align: 'center' },
      )
      y += 28
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.text(`${i + 1}. ${ev.nomeArquivo}`, marginX, y + 4)
    y += legendH + gapH
  }

  return y
}

function renderSectionHeader(doc: jsPDF, title: string, y: number, pageW: number, marginX: number): number {
  doc.setFillColor(3, 105, 161)
  doc.rect(marginX, y, pageW - marginX * 2, 9, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(title, marginX + 4, y + 6.2)
  return y + 14
}

async function buildTratativaPDFDoc(
  nc: NaoConformidade,
  trechos: NormaTrecho[],
  ocorrenciaImagens: Evidencia[],
  atividadeEvidencias: Map<string, Evidencia[]>,
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const marginX = 15
  let y: number

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('SGS — Sistema de Gestão de Segurança', marginX, 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(186, 230, 253)
  doc.text('Relatório de Tratativa de Não Conformidade', marginX, 22)
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(8)
  doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, pageW - marginX, 22, { align: 'right' })

  y = 38

  // ── Título + tags ──────────────────────────────────────────────────────────
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  const tituloLines = doc.splitTextToSize(nc.titulo || '—', pageW - marginX * 2)
  doc.text(tituloLines, marginX, y)
  y += tituloLines.length * 6 + 2

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  const tags: string[] = [`Status: ${nc.status}`]
  if (nc.nivelRisco) tags.push(`Risco: ${nc.nivelRisco}`)
  if (nc.regraDeOuro) tags.push('Regra de Ouro')
  if (nc.reincidencia) tags.push('Reincidência')
  doc.text(tags.join('  ·  '), marginX, y)
  y += 10

  // ════════════════════════════════════════════════════════════════════════════
  // SEÇÃO: OCORRÊNCIA
  // ════════════════════════════════════════════════════════════════════════════
  if (y > 240) { doc.addPage(); y = 20 }
  y = renderSectionHeader(doc, 'OCORRÊNCIA', y, pageW, marginX)

  const rows: [string, string][] = [
    ['Estabelecimento', nc.estabelecimentoNome || '—'],
    ['Localização', nc.localizacaoNome || '—'],
    ['Data de Registro', formatDate(nc.dataRegistro) || '—'],
    ['Prazo para Resolução', formatDate(nc.dataLimiteResolucao) || '—'],
    ['Usuário de Registro', nc.usuarioCriacaoNome || nc.tecnicoNome || '—'],
    [
      'Eng. Responsável pela NC',
      nc.responsavelNcNome
        ? `${nc.responsavelNcNome} (${nc.responsavelNcEmail ?? ''})`
        : nc.responsavelNcEmail || '—',
    ],
    [
      'Eng. Responsável pela Tratativa',
      nc.responsavelTrativaNome
        ? `${nc.responsavelTrativaNome} (${nc.responsavelTrativaEmail ?? ''})`
        : nc.responsavelTrativaEmail || '—',
    ],
  ]

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['Campo', 'Valor']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [3, 105, 161], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 65, fontStyle: 'bold', textColor: [71, 85, 105] } },
  })
  y = doc.lastAutoTable.finalY + 8

  // Descrição
  if (y > 250) { doc.addPage(); y = 20 }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text('Descrição', marginX, y)
  y += 5
  const descLines = doc.splitTextToSize(nc.descricao || '—', pageW - marginX * 2)
  if (y + descLines.length * 5 > 275) { doc.addPage(); y = 20 }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(30, 41, 59)
  doc.text(descLines, marginX, y)
  y += descLines.length * 5 + 6

  // Normas Vinculadas
  if (nc.normas && nc.normas.length > 0) {
    if (y > 250) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)
    doc.text('Normas Vinculadas', marginX, y)
    y += 3

    const normaRows: [string, string, string][] = []
    for (const n of nc.normas) {
      const ts = trechos.filter(t => t.normaId === n.id)
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

  // Evidências da Ocorrência
  await renderEvidenciasSection(doc, ocorrenciaImagens)
  if (ocorrenciaImagens.length > 0) {
    doc.addPage()
    y = 20
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SEÇÃO: INVESTIGAÇÃO
  // ════════════════════════════════════════════════════════════════════════════
  const porques = [
    { pergunta: nc.porqueUm, resposta: nc.porqueUmResposta },
    { pergunta: nc.porqueDois, resposta: nc.porqueDoisResposta },
    { pergunta: nc.porqueTres, resposta: nc.porqueTresResposta },
    { pergunta: nc.porqueQuatro, resposta: nc.porqueQuatroResposta },
    { pergunta: nc.porqueCinco, resposta: nc.porqueCincoResposta },
  ].filter(p => p.pergunta)

  const temInvestigacao = porques.length > 0 || !!nc.causaRaiz
  if (temInvestigacao) {
    if (y > 230) { doc.addPage(); y = 20 }
    y = renderSectionHeader(doc, 'INVESTIGAÇÃO — 5 PORQUÊS E CAUSA RAIZ', y, pageW, marginX)

    if (porques.length > 0) {
      autoTable(doc, {
        startY: y,
        margin: { left: marginX, right: marginX },
        head: [['#', 'Pergunta', 'Resposta']],
        body: porques.map((p, i) => [`${i + 1}`, p.pergunta || '—', p.resposta || '—']),
        theme: 'grid',
        headStyles: { fillColor: [3, 105, 161], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { cellWidth: 10, halign: 'center' as const }, 1: { cellWidth: 80 } },
      })
      y = doc.lastAutoTable.finalY + 8
    }

    if (nc.causaRaiz) {
      if (y > 255) { doc.addPage(); y = 20 }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(71, 85, 105)
      doc.text('Causa Raiz', marginX, y)
      y += 5

      const causaLines = doc.splitTextToSize(nc.causaRaiz, pageW - marginX * 2 - 10)
      const blockH = Math.max(causaLines.length * 5 + 8, 18)
      doc.setFillColor(239, 246, 255)
      doc.rect(marginX, y - 2, pageW - marginX * 2, blockH, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(30, 58, 138)
      doc.text(causaLines, marginX + 5, y + 4)
      y += blockH + 8
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SEÇÃO: PLANO DE AÇÃO
  // ════════════════════════════════════════════════════════════════════════════
  const atividades = nc.atividades ?? []
  if (atividades.length > 0) {
    if (y > 230) { doc.addPage(); y = 20 }
    y = renderSectionHeader(doc, 'PLANO DE AÇÃO', y, pageW, marginX)

    const planoRows: [string, string, string][] = atividades.map(a => {
      const statusLabel =
        a.status === 'APROVADA' ? 'Aprovada'
        : a.status === 'REJEITADA' ? 'Rejeitada'
        : 'Pendente'
      return [`${a.ordem}`, a.titulo, statusLabel]
    })

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['#', 'Atividade', 'Status']],
      body: planoRows,
      theme: 'grid',
      headStyles: { fillColor: [3, 105, 161], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' as const, fontStyle: 'bold' },
        2: { cellWidth: 28, halign: 'center' as const },
      },
    })
    y = doc.lastAutoTable.finalY + 8

    // Descrição de cada atividade
    for (const a of atividades) {
      if (y > 255) { doc.addPage(); y = 20 }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(15, 23, 42)
      doc.text(`${a.ordem}. ${a.titulo}`, marginX, y)
      y += 4
      const lines = doc.splitTextToSize(a.descricao || '—', pageW - marginX * 2 - 4)
      if (y + lines.length * 4.5 > 272) { doc.addPage(); y = 20 }
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(30, 41, 59)
      doc.text(lines, marginX + 4, y)
      y += lines.length * 4.5 + 5
      doc.setDrawColor(226, 232, 240)
      doc.line(marginX, y, pageW - marginX, y)
      y += 5
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SEÇÃO: O QUE FOI EXECUTADO
  // ════════════════════════════════════════════════════════════════════════════
  const temExecucao = atividades.some(
    a => a.descricaoExecucao || (atividadeEvidencias.get(a.id)?.length ?? 0) > 0,
  )
  if (temExecucao) {
    if (y > 220) { doc.addPage(); y = 20 }
    y = renderSectionHeader(doc, 'O QUE FOI EXECUTADO', y, pageW, marginX)

    for (const a of atividades) {
      const imagens = atividadeEvidencias.get(a.id) ?? []
      if (!a.descricaoExecucao && imagens.length === 0) continue

      if (y > 255) { doc.addPage(); y = 20 }

      // Cabeçalho da atividade
      doc.setFillColor(241, 245, 249)
      doc.rect(marginX, y - 1, pageW - marginX * 2, 8, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(15, 23, 42)
      doc.text(`${a.ordem}. ${a.titulo}`, marginX + 3, y + 5)
      y += 12

      // O que foi executado
      if (a.descricaoExecucao) {
        const execLines = doc.splitTextToSize(a.descricaoExecucao, pageW - marginX * 2 - 8)
        if (y + execLines.length * 4.5 > 272) { doc.addPage(); y = 20 }
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(8)
        doc.setTextColor(30, 41, 59)
        doc.text(execLines, marginX + 4, y)
        y += execLines.length * 4.5 + 4
      }

      // Evidências de execução
      if (imagens.length > 0) {
        y = await renderAtividadeImagens(doc, imagens, y, pageW, marginX)
      }

      y += 4
      doc.setDrawColor(226, 232, 240)
      doc.line(marginX, y, pageW - marginX, y)
      y += 6
    }
  }

  // ── Footer em todas as páginas ────────────────────────────────────────────
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

export async function exportTratativaBundle(
  nc: NaoConformidade,
  trechos: NormaTrecho[] = [],
): Promise<void> {
  const atividades = nc.atividades ?? []
  const [ocorrenciaEvidencias, ...atividadesEvs] = await Promise.all([
    getEvidencias(nc.id, 'OCORRENCIA'),
    ...atividades.map(a => getEvidenciasAtividade(a.id)),
  ])

  const ocorrenciaImagens = ocorrenciaEvidencias.filter(e => IMAGE_EXTS.has(getExt(e.nomeArquivo)))

  const atividadeEvidencias = new Map<string, Evidencia[]>()
  atividades.forEach((a, i) => {
    const imgs = atividadesEvs[i].filter(e => IMAGE_EXTS.has(getExt(e.nomeArquivo)))
    atividadeEvidencias.set(a.id, imgs)
  })

  const doc = await buildTratativaPDFDoc(nc, trechos, ocorrenciaImagens, atividadeEvidencias)

  const titulo = sanitize(nc.titulo || nc.id)
  const date = new Date().toISOString().slice(0, 10)
  doc.save(`Tratativa_NC_${titulo}_${date}.pdf`)
}
