import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, PlusCircle, Wallet, BarChart3, Trash2, Upload,
  CheckCircle2, XCircle, Filter, ArrowUpRight, ArrowDownRight, Clock, Award,
  Image as ImageIcon, X, RefreshCw, MessageSquare, Calendar, ChevronDown, ChevronUp, Edit3, Check
} from 'lucide-react';
import { supabase } from './supabaseClient';

interface Trade {
  id: number;
  data: string;
  sessao: string;
  conta_id: string;
  ativo: string;
  direcao: 'Buy' | 'Sell';
  resultado: 'TP' | 'SL' | 'BE';
  pnl: number;
  comissao: number;
  duracao: string;
  seguiu_plano: boolean;
  emocao: string;
  comentarios: string;
  foto_url?: string;
}

interface Conta {
  id: number;
  nome: string;
  tipo: 'Teste' | 'Real';
  status: 'Em andamento' | 'Aprovada' | 'Reprovada';
  tamanho: string;
  numero: string;
}

interface Movimentacao {
  id: number;
  empresa: string;
  tipo: 'Custo' | 'Retiro';
  valor: number;
  data: string;
  comprovante_url?: string;
}

const EMOCOES = [
  { label: 'Tranquilo', emoji: '😌' },
  { label: 'Impaciente', emoji: '😤' },
  { label: 'Com Medo', emoji: '😰' },
  { label: 'Eufórico', emoji: '🤑' },
  { label: 'Frustrado', emoji: '😡' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'operacoes' | 'mesas'>('operacoes');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dados do Supabase
  const [trades, setTrades] = useState<Trade[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);

  // Filtros de Data e Ordenação
  const [periodoFiltro, setPeriodoFiltro] = useState<string>('30d');
  const [dataInicioFiltro, setDataInicioFiltro] = useState('');
  const [dataFimFiltro, setDataFimFiltro] = useState('');
  const [contaFiltro, setContaFiltro] = useState<string>('todas');
  const [ordenacao, setOrdenacao] = useState<'data_desc' | 'data_asc' | 'pnl_desc' | 'pnl_asc'>('data_desc');
  const [notasPeriodo, setNotasPeriodo] = useState<string>(() => localStorage.getItem('trading_notas_periodo') || '');

  // Modais
  const [modal, setModal] = useState<{ tipo: 'imagem' | 'texto', conteudo: string, titulo?: string } | null>(null);

  // Formulário de Novo Trade
  const [dataTrade, setDataTrade] = useState(new Date().toISOString().split('T')[0]);
  const [sessao, setSessao] = useState('NY');
  const [contaId, setContaId] = useState('');
  const [direcao, setDirecao] = useState<'Buy' | 'Sell'>('Buy');
  const [resultado, setResultado] = useState<'TP' | 'SL' | 'BE'>('TP');
  const [pnl, setPnl] = useState('');
  const [comissao, setComissao] = useState('');
  const [duracaoValor, setDuracaoValor] = useState('');
  const [duracaoUnidade, setDuracaoUnidade] = useState<'min' | 'H'>('min');
  const [seguiuPlano, setSeguiuPlano] = useState(true);
  const [emocao, setEmocao] = useState('Tranquilo');
  const [comentarios, setComentarios] = useState('');
  const [fotoTrade, setFotoTrade] = useState<File | null>(null);

  // Formulário de Nova Conta
  const [nomeConta, setNomeConta] = useState('');
  const [tipoConta, setTipoConta] = useState<'Teste' | 'Real'>('Teste');
  const [tamanhoConta, setTamanhoConta] = useState('50K');
  const [numeroConta, setNumeroConta] = useState('');
  const [statusConta, setStatusConta] = useState<'Em andamento' | 'Aprovada' | 'Reprovada'>('Em andamento');

  // Formulário de Movimentação
  const [empresaMov, setEmpresaMov] = useState('');
  const [tipoMov, setTipoMov] = useState<'Custo' | 'Retiro'>('Custo');
  const [valorMov, setValorMov] = useState('');
  const [dataMov, setDataMov] = useState(new Date().toISOString().split('T')[0]);
  const [fotoComprovante, setFotoComprovante] = useState<File | null>(null);

  // Edição em Tabela
  const [editTradeId, setEditTradeId] = useState<number | null>(null);
  const [editTradeConta, setEditTradeConta] = useState('');

  const [editMovId, setEditMovId] = useState<number | null>(null);
  const [editMovValor, setEditMovValor] = useState('');

  useEffect(() => {
    localStorage.setItem('trading_notas_periodo', notasPeriodo);
  }, [notasPeriodo]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resTrades, resContas, resMov] = await Promise.all([
        supabase.from('trades').select('*').order('data', { ascending: false }).order('id', { ascending: false }),
        supabase.from('contas').select('*').order('id', { ascending: false }),
        supabase.from('movimentacoes').select('*').order('data', { ascending: false }).order('id', { ascending: false }),
      ]);
      if (resTrades.data) setTrades(resTrades.data);
      if (resContas.data) {
        setContas(resContas.data);
        if (resContas.data.length > 0 && !contaId) setContaId(String(resContas.data[0].id));
      }
      if (resMov.data) setMovimentacoes(resMov.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const uploadImagem = async (file: File, pasta: string): Promise<string | null> => {
    try {
      const extensao = file.name.split('.').pop();
      const nome = `${pasta}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extensao}`;
      const { error } = await supabase.storage.from('imagens_trades').upload(nome, file);
      if (error) { alert('Erro upload: ' + error.message); return null; }
      return supabase.storage.from('imagens_trades').getPublicUrl(nome).data.publicUrl;
    } catch { return null; }
  };

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pnl) return;
    setSaving(true);
    const fotoUrl = fotoTrade ? await uploadImagem(fotoTrade, 'charts') : null;
    const valorPnl = parseFloat(pnl);
    const valComissao = parseFloat(comissao) || 0;
    
    // Calcula PNL Líquido (se for SL, fica negativo e subtrai comissão. Se for TP, positivo e subtrai comissão)
    let pnlBruto = resultado === 'SL' ? -Math.abs(valorPnl) : resultado === 'BE' ? 0 : Math.abs(valorPnl);
    let pnlLiquido = pnlBruto - valComissao;

    const { error } = await supabase.from('trades').insert([{
      data: dataTrade, sessao, conta_id: contaId || 'Geral', ativo: 'MNQ!', direcao, resultado,
      pnl: pnlLiquido, comissao: valComissao, duracao: duracaoValor ? `${duracaoValor} ${duracaoUnidade}` : '-',
      seguiu_plano: seguiuPlano, emocao, comentarios, foto_url: fotoUrl,
    }]);

    if (!error) {
      setPnl(''); setComissao(''); setComentarios(''); setFotoTrade(null);
      await carregarDados();
    }
    setSaving(false);
  };

  const salvarEdicaoTradeConta = async (id: number) => {
    if (!editTradeConta) return;
    await supabase.from('trades').update({ conta_id: editTradeConta }).eq('id', id);
    setEditTradeId(null);
    carregarDados();
  };

  const salvarEdicaoMov = async (id: number) => {
    await supabase.from('movimentacoes').update({ valor: Math.abs(parseFloat(editMovValor)) }).eq('id', id);
    setEditMovId(null);
    carregarDados();
  };

  const handleDelete = async (tabela: string, id: number) => {
    if (!confirm('Excluir este registro?')) return;
    await supabase.from(tabela).delete().eq('id', id);
    carregarDados();
  };

  const handleAddConta = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('contas').insert([{ nome: nomeConta, tipo: tipoConta, tamanho: tamanhoConta, numero: numeroConta, status: statusConta }]);
    setNomeConta(''); setNumeroConta(''); carregarDados();
    setSaving(false);
  };

  const handleAddMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const url = (tipoMov === 'Retiro' && fotoComprovante) ? await uploadImagem(fotoComprovante, 'retiros') : null;
    await supabase.from('movimentacoes').insert([{ empresa: empresaMov, tipo: tipoMov, valor: Math.abs(parseFloat(valorMov)), data: dataMov, comprovante_url: url }]);
    setEmpresaMov(''); setValorMov(''); setFotoComprovante(null); carregarDados();
    setSaving(false);
  };

  // Cores Baseadas no ID da Conta
  const getContaColor = (id: string) => {
    const colors = ['border-blue-500 text-blue-400', 'border-purple-500 text-purple-400', 'border-orange-500 text-orange-400', 'border-cyan-500 text-cyan-400', 'border-pink-500 text-pink-400'];
    const index = parseInt(id) || 0;
    return colors[index % colors.length];
  };

  const tradesFiltrados = useMemo(() => {
    const hoje = new Date(); hoje.setHours(23, 59, 59, 999);
    let filtrados = trades.filter((t) => {
      if (contaFiltro !== 'todas' && String(t.conta_id) !== contaFiltro) return false;
      const dataT = new Date(t.data + 'T12:00:00');
      
      if (periodoFiltro === 'custom') {
        if (dataInicioFiltro && dataT < new Date(dataInicioFiltro + 'T00:00:00')) return false;
        if (dataFimFiltro && dataT > new Date(dataFimFiltro + 'T23:59:59')) return false;
        return true;
      }
      
      const diffDias = (hoje.getTime() - dataT.getTime()) / (1000 * 3600 * 24);
      if (periodoFiltro === 'semana') {
        const inicioSemana = new Date(hoje); inicioSemana.setDate(hoje.getDate() - hoje.getDay()); inicioSemana.setHours(0, 0, 0, 0);
        return dataT >= inicioSemana;
      }
      if (periodoFiltro === '15d') return diffDias <= 15;
      if (periodoFiltro === '30d') return diffDias <= 30;
      if (periodoFiltro === '60d') return diffDias <= 60;
      if (periodoFiltro === '3m') return diffDias <= 90;
      if (periodoFiltro === '12m') return diffDias <= 365;
      return true;
    });

    filtrados.sort((a, b) => {
      if (ordenacao === 'data_desc') return new Date(b.data).getTime() - new Date(a.data).getTime();
      if (ordenacao === 'data_asc') return new Date(a.data).getTime() - new Date(b.data).getTime();
      if (ordenacao === 'pnl_desc') return b.pnl - a.pnl;
      if (ordenacao === 'pnl_asc') return a.pnl - b.pnl;
      return 0;
    });

    return filtrados;
  }, [trades, periodoFiltro, contaFiltro, ordenacao, dataInicioFiltro, dataFimFiltro]);

  const metricas = useMemo(() => {
    let pnlTotal = 0, wins = 0, loss = 0, be = 0;
    let somaWin = 0, somaLoss = 0;
    let seguiuPlanoCount = 0;
    let grafico: {x: number, y: number}[] = [{x: 0, y: 0}];

    // Para o gráfico cronológico
    const cronologico = [...tradesFiltrados].sort((a,b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    let pnlAcumulado = 0;

    cronologico.forEach((t, i) => {
      pnlAcumulado += Number(t.pnl);
      grafico.push({ x: i + 1, y: pnlAcumulado });
      
      pnlTotal += Number(t.pnl);
      if (t.resultado === 'TP') { wins++; somaWin += Number(t.pnl); }
      else if (t.resultado === 'SL') { loss++; somaLoss += Math.abs(Number(t.pnl)); }
      else if (t.resultado === 'BE') { be++; }
      if (t.seguiu_plano) seguiuPlanoCount++;
    });

    const total = tradesFiltrados.length;
    const avgWin = wins > 0 ? somaWin / wins : 0;
    const avgLoss = loss > 0 ? somaLoss / loss : 0;
    const rrMedio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : (avgWin > 0 ? 'Max' : '0.00');
    
    return {
      pnlTotal, total, wins, loss, be,
      winRate: total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0',
      planoRespeitado: total > 0 ? ((seguiuPlanoCount / total) * 100).toFixed(1) : '0.0',
      rrMedio, avgWin, avgLoss, grafico
    };
  }, [tradesFiltrados]);

  const corPnl = (val: number) => val > 0 ? 'text-[#00ff88]' : val < 0 ? 'text-red-500' : 'text-zinc-300';

  // SVG Gráfico de Equity
  const renderGrafico = () => {
    if (metricas.grafico.length <= 1) return null;
    const w = 300, h = 80;
    const minPnl = Math.min(...metricas.grafico.map(g => g.y));
    const maxPnl = Math.max(...metricas.grafico.map(g => g.y));
    const rangeY = (maxPnl - minPnl) || 1;
    const pts = metricas.grafico.map(g => {
      const px = (g.x / (metricas.grafico.length - 1)) * w;
      const py = h - ((g.y - minPnl) / rangeY) * h;
      return `${px},${py}`;
    }).join(' ');
    
    return (
      <svg viewBox={`0 -10 ${w} ${h+20}`} className="w-full h-16 drop-shadow-md">
        <polyline points={pts} fill="none" stroke={metricas.pnlTotal >= 0 ? "#00ff88" : "#ef4444"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans text-xs selection:bg-[#00ff88] selection:text-black">
      {/* Header com Logo Nova */}
      <header className="border-b border-zinc-900 bg-[#0a0a0a]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-black border border-zinc-700 flex items-center justify-center shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                MNQ! <span className="text-zinc-400 font-medium">JOURNAL</span>
              </h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse"></span> Cloud Sync
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#111111] p-1 rounded-xl border border-zinc-800/80">
            <button onClick={() => setActiveTab('operacoes')} className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'operacoes' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>
              <BarChart3 className="w-4 h-4" /> Entradas
            </button>
            <button onClick={() => setActiveTab('mesas')} className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'mesas' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>
              <Wallet className="w-4 h-4" /> Mesas
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center py-20 text-zinc-500"><RefreshCw className="w-8 h-8 animate-spin" /></div>
        ) : activeTab === 'operacoes' ? (
          <>
            {/* NOVO TRADE */}
            <section className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><PlusCircle className="w-4 h-4" /> Nova Entrada</h2>
              <form onSubmit={handleAddTrade} className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">DATA</label>
                    <input type="date" value={dataTrade} onChange={(e) => setDataTrade(e.target.value)} className="w-full bg-[#141414] border border-zinc-800 rounded-lg px-2 py-1.5 text-white focus:border-zinc-500" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">CONTA</label>
                    <select value={contaId} onChange={(e) => setContaId(e.target.value)} className="w-full bg-[#141414] border border-zinc-800 rounded-lg px-2 py-1.5 text-white">
                      <option value="Geral">Geral</option>
                      {contas.filter(c => c.status !== 'Reprovada').map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">DIREÇÃO</label>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setDirecao('Buy')} className={`flex-1 py-1.5 rounded-lg border font-bold ${direcao === 'Buy' ? 'bg-zinc-800 border-zinc-600 text-white' : 'border-zinc-800 text-zinc-500'}`}>Buy</button>
                      <button type="button" onClick={() => setDirecao('Sell')} className={`flex-1 py-1.5 rounded-lg border font-bold ${direcao === 'Sell' ? 'bg-zinc-800 border-zinc-600 text-white' : 'border-zinc-800 text-zinc-500'}`}>Sell</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">RESULTADO</label>
                    <div className="flex gap-1">
                      {(['TP', 'SL', 'BE'] as const).map(r => (
                        <button key={r} type="button" onClick={() => setResultado(r)} className={`flex-1 py-1.5 rounded-lg border font-bold ${resultado === r ? (r==='TP'?'bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/30':r==='SL'?'bg-red-500/20 text-red-400 border-red-500/30':'bg-zinc-700 text-white') : 'bg-[#141414] border-zinc-800 text-zinc-500'}`}>{r}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">PNL BRUTO ($)</label>
                    <input type="number" step="0.01" value={pnl} onChange={(e) => setPnl(e.target.value)} placeholder="0.00" className="w-full bg-[#141414] border border-zinc-800 rounded-lg px-2 py-1.5 text-white" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">COMISSÃO ($)</label>
                    <input type="number" step="0.01" value={comissao} onChange={(e) => setComissao(e.target.value)} placeholder="0.00" className="w-full bg-[#141414] border border-zinc-800 rounded-lg px-2 py-1.5 text-white" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">EMOÇÃO & PLANO</label>
                    <div className="flex gap-2">
                      <select value={emocao} onChange={(e) => setEmocao(e.target.value)} className="w-1/2 bg-[#141414] border border-zinc-800 rounded-lg px-2 text-white">
                        {EMOCOES.map(e => <option key={e.label} value={e.label}>{e.emoji} {e.label}</option>)}
                      </select>
                      <button type="button" onClick={() => setSeguiuPlano(!seguiuPlano)} className={`w-1/2 rounded-lg font-bold border ${seguiuPlano ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {seguiuPlano ? 'Seguiu Plano' : 'Fugiu do Plano'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <input type="text" placeholder="Comentários e anotações..." value={comentarios} onChange={(e) => setComentarios(e.target.value)} className="flex-1 bg-[#141414] border border-zinc-800 rounded-lg px-3 py-2 text-white" />
                  <label className="flex items-center gap-2 bg-[#141414] border border-zinc-800 rounded-lg px-3 py-2 text-zinc-400 cursor-pointer hover:bg-zinc-900 truncate max-w-[150px]">
                    <Upload className="w-4 h-4" /> <span className="truncate">{fotoTrade ? fotoTrade.name : 'Print'}</span>
                    <input type="file" accept="image/*" onChange={(e) => setFotoTrade(e.target.files?.[0] || null)} className="hidden" />
                  </label>
                  <button type="submit" disabled={saving} className="bg-white text-black font-bold px-6 py-2 rounded-lg hover:bg-zinc-200">
                    {saving ? '...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </section>

            {/* DASHBOARD & FILTROS */}
            <section className="space-y-4">
              <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Filter className="w-4 h-4 text-zinc-500 mr-1" />
                  {[ {id:'semana', l:'Semana'}, {id:'30d', l:'30 Dias'}, {id:'12m', l:'Ano'}, {id:'custom', l:'Personalizado'} ].map(p => (
                    <button key={p.id} onClick={() => setPeriodoFiltro(p.id)} className={`px-3 py-1.5 rounded-lg font-bold transition-all ${periodoFiltro === p.id ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-900'}`}>{p.l}</button>
                  ))}
                  {periodoFiltro === 'custom' && (
                    <div className="flex items-center gap-1 ml-2">
                      <input type="date" value={dataInicioFiltro} onChange={e=>setDataInicioFiltro(e.target.value)} className="bg-[#141414] border border-zinc-800 rounded text-[10px] p-1 text-white" />
                      <span className="text-zinc-500">ate</span>
                      <input type="date" value={dataFimFiltro} onChange={e=>setDataFimFiltro(e.target.value)} className="bg-[#141414] border border-zinc-800 rounded text-[10px] p-1 text-white" />
                    </div>
                  )}
                </div>
                <select value={contaFiltro} onChange={(e) => setContaFiltro(e.target.value)} className="bg-[#141414] border border-zinc-800 rounded-lg px-3 py-1.5 text-white font-bold">
                  <option value="todas">Todas as Contas</option>
                  {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              {/* Métricas e Gráfico */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="lg:col-span-2 bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">Equity Curve (P&L)</span>
                  <div className="mt-2 w-full flex-1 flex items-center justify-center">{renderGrafico()}</div>
                </div>
                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-center text-center">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">P&L LÍQUIDO</span>
                  <p className={`text-xl font-black mt-1 ${corPnl(metricas.pnlTotal)}`}>{metricas.pnlTotal > 0 ? '+' : ''}${metricas.pnlTotal.toFixed(2)}</p>
                </div>
                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-center text-center">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">WINS / LOSS / BE</span>
                  <p className="text-lg font-black text-white mt-1">{metricas.wins} <span className="text-zinc-600">/</span> {metricas.loss} <span className="text-zinc-600">/</span> {metricas.be}</p>
                </div>
                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-center text-center">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">WIN RATE</span>
                  <p className="text-xl font-black text-white mt-1">{metricas.winRate}%</p>
                </div>
                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-center text-center">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">RR MÉDIO</span>
                  <p className="text-xl font-black text-white mt-1">{metricas.rrMedio}</p>
                </div>
                <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-center text-center">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">MÉDIA WIN/LOSS</span>
                  <p className="text-[11px] font-bold text-zinc-400 mt-1">W: <span className="text-[#00ff88]">${metricas.avgWin.toFixed(0)}</span></p>
                  <p className="text-[11px] font-bold text-zinc-400">L: <span className="text-red-400">${metricas.avgLoss.toFixed(0)}</span></p>
                </div>
              </div>
            </section>

            {/* TABELA DE HISTÓRICO */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-zinc-500 uppercase">Histórico ({metricas.total})</h3>
                <div className="flex gap-2">
                  <button onClick={() => setOrdenacao(ordenacao === 'data_desc' ? 'data_asc' : 'data_desc')} className="text-[10px] bg-zinc-900 px-2 py-1 rounded text-zinc-400 hover:text-white flex items-center">Data {ordenacao === 'data_desc' ? <ChevronDown className="w-3 h-3"/> : <ChevronUp className="w-3 h-3"/>}</button>
                  <button onClick={() => setOrdenacao(ordenacao === 'pnl_desc' ? 'pnl_asc' : 'pnl_desc')} className="text-[10px] bg-zinc-900 px-2 py-1 rounded text-zinc-400 hover:text-white flex items-center">P&L {ordenacao === 'pnl_desc' ? <ChevronDown className="w-3 h-3"/> : <ChevronUp className="w-3 h-3"/>}</button>
                </div>
              </div>

              <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#111111] text-zinc-500 uppercase">
                    <tr>
                      <th className="py-2 px-3">Data</th>
                      <th className="py-2 px-3">Conta</th>
                      <th className="py-2 px-3">Direção</th>
                      <th className="py-2 px-3">Resultado</th>
                      <th className="py-2 px-3">P&L Liq.</th>
                      <th className="py-2 px-3">Comissão</th>
                      <th className="py-2 px-3">Ações / Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {tradesFiltrados.map((t) => {
                      const c = contas.find(x => String(x.id) === String(t.conta_id));
                      const contaNome = c ? c.nome : 'Geral';
                      const contaColor = getContaColor(t.conta_id);
                      return (
                        <tr key={t.id} className="hover:bg-zinc-900/30">
                          <td className="py-2 px-3 text-zinc-300 font-medium">{t.data} <span className="text-zinc-600 text-[9px] block">{t.sessao}</span></td>
                          <td className="py-2 px-3">
                            {editTradeId === t.id ? (
                              <div className="flex items-center gap-1">
                                <select value={editTradeConta} onChange={e=>setEditTradeConta(e.target.value)} className="bg-black border border-zinc-700 text-white rounded p-1 text-[10px]">
                                  <option value="Geral">Geral</option>
                                  {contas.map(acc => <option key={acc.id} value={acc.id}>{acc.nome}</option>)}
                                </select>
                                <button onClick={() => salvarEdicaoTradeConta(t.id)} className="text-[#00ff88]"><Check className="w-3 h-3"/></button>
                              </div>
                            ) : (
                              <span className={`px-2 py-0.5 rounded border ${contaColor} bg-black/50 text-[10px] flex items-center gap-1 w-max`}>
                                {contaNome} <button onClick={() => {setEditTradeId(t.id); setEditTradeConta(t.conta_id);}} className="text-zinc-500 hover:text-white ml-1"><Edit3 className="w-3 h-3"/></button>
                              </span>
                            )}
                          </td>
                          <td className={`py-2 px-3 font-bold ${t.direcao === 'Buy' ? 'text-white' : 'text-zinc-400'}`}>{t.direcao}</td>
                          <td className="py-2 px-3"><span className={`px-1.5 py-0.5 rounded font-bold ${t.resultado==='TP'?'bg-[#00ff88]/20 text-[#00ff88]':t.resultado==='SL'?'bg-red-500/20 text-red-400':'bg-zinc-800 text-zinc-300'}`}>{t.resultado}</span></td>
                          <td className={`py-2 px-3 font-black text-sm ${corPnl(t.pnl)}`}>{t.pnl > 0 ? '+' : ''}${Math.abs(t.pnl).toFixed(2)}</td>
                          <td className="py-2 px-3 text-zinc-500 font-medium">${t.comissao?.toFixed(2) || '0.00'}</td>
                          <td className="py-2 px-3 flex items-center gap-3">
                            {t.comentarios && <button onClick={() => setModal({tipo:'texto', titulo: 'Comentários do Trade', conteudo: t.comentarios})} className="text-zinc-400 hover:text-white"><MessageSquare className="w-4 h-4" /></button>}
                            {t.foto_url && <button onClick={() => setModal({tipo:'imagem', conteudo: t.foto_url!})} className="text-zinc-400 hover:text-white"><ImageIcon className="w-4 h-4" /></button>}
                            <button onClick={() => handleDelete('trades', t.id)} className="text-zinc-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          /* ABA MESAS */
          <div className="space-y-6">
            <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Award className="w-4 h-4" /> Cadastrar Mesa / Conta</h3>
              <form onSubmit={handleAddConta} className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <input type="text" placeholder="Nome (Ex: Topstep)" value={nomeConta} onChange={(e) => setNomeConta(e.target.value)} className="col-span-2 bg-[#141414] border border-zinc-800 rounded-lg px-3 py-2 text-white" required />
                <select value={tamanhoConta} onChange={(e) => setTamanhoConta(e.target.value)} className="bg-[#141414] border border-zinc-800 rounded-lg px-3 py-2 text-white">
                  {['10K','25K','50K','100K','150K','250K'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={tipoConta} onChange={(e) => setTipoConta(e.target.value as any)} className="bg-[#141414] border border-zinc-800 rounded-lg px-3 py-2 text-white">
                  <option value="Teste">Teste (Exame)</option><option value="Real">Real (Funded)</option>
                </select>
                <input type="text" placeholder="Nº da Conta (Opcional)" value={numeroConta} onChange={(e) => setNumeroConta(e.target.value)} className="bg-[#141414] border border-zinc-800 rounded-lg px-3 py-2 text-white" />
                <button type="submit" disabled={saving} className="bg-white text-black font-bold rounded-lg px-3 py-2 hover:bg-zinc-200">+ Conta</button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {contas.map(c => (
                  <div key={c.id} className={`flex flex-col gap-2 bg-[#111] border-l-4 rounded-r-xl p-3 ${c.status === 'Aprovada' ? 'border-[#00ff88]' : c.status === 'Reprovada' ? 'border-red-500' : 'border-blue-500'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white text-sm">{c.nome} <span className="text-zinc-500 text-[10px] bg-black px-1.5 py-0.5 rounded">{c.tamanho}</span></h4>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{c.numero || 'Sem número'} • {c.tipo}</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <select value={c.status} onChange={async (e) => { await supabase.from('contas').update({status: e.target.value}).eq('id', c.id); carregarDados(); }} className="bg-black border border-zinc-800 text-[10px] text-zinc-300 rounded p-1">
                          <option value="Em andamento">Andamento</option><option value="Aprovada">Aprovada</option><option value="Reprovada">Reprovada</option>
                        </select>
                        <button onClick={() => handleDelete('contas', c.id)} className="text-zinc-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5"/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0d0d0d] border border-zinc-800/80 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Wallet className="w-4 h-4" /> Financeiro (Custos e Saques)</h3>
              <form onSubmit={handleAddMovimentacao} className="flex gap-3 items-end">
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">TIPO</label>
                    <select value={tipoMov} onChange={e=>setTipoMov(e.target.value as any)} className="w-full bg-[#141414] border border-zinc-800 rounded-lg px-2 py-1.5 text-white">
                      <option value="Custo">Custo (Exame/Taxa)</option><option value="Retiro">Retiro (Saque)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">EMPRESA</label>
                    <input type="text" value={empresaMov} onChange={e=>setEmpresaMov(e.target.value)} className="w-full bg-[#141414] border border-zinc-800 rounded-lg px-2 py-1.5 text-white" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">VALOR ($)</label>
                    <input type="number" step="0.01" value={valorMov} onChange={e=>setValorMov(e.target.value)} className="w-full bg-[#141414] border border-zinc-800 rounded-lg px-2 py-1.5 text-white" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">DATA</label>
                    <input type="date" value={dataMov} onChange={e=>setDataMov(e.target.value)} className="w-full bg-[#141414] border border-zinc-800 rounded-lg px-2 py-1.5 text-white" required />
                  </div>
                </div>
                <button type="submit" className="bg-white text-black font-bold px-4 py-1.5 rounded-lg h-[34px] hover:bg-zinc-200">Salvar</button>
              </form>

              <div className="mt-4 space-y-2">
                {movimentacoes.map(m => (
                  <div key={m.id} className="flex items-center justify-between bg-[#111] border border-zinc-800/50 p-2.5 rounded-lg">
                    <span className="font-bold text-white">{m.empresa} <span className="text-zinc-500 font-normal text-[10px] ml-2">{m.data}</span></span>
                    <div className="flex items-center gap-3">
                      {editMovId === m.id ? (
                        <div className="flex items-center gap-1">
                          <input type="number" step="0.01" value={editMovValor} onChange={e=>setEditMovValor(e.target.value)} className="w-16 bg-black border border-zinc-700 text-white rounded px-1 text-[11px]" />
                          <button onClick={() => salvarEdicaoMov(m.id)} className="text-[#00ff88]"><Check className="w-3.5 h-3.5"/></button>
                        </div>
                      ) : (
                        <span className={`font-black ${m.tipo === 'Retiro' ? 'text-[#00ff88]' : 'text-red-400'}`}>
                          {m.tipo==='Retiro'?'+':'-'}${m.valor.toFixed(2)} <button onClick={()=>{setEditMovId(m.id); setEditMovValor(String(m.valor));}} className="text-zinc-600 hover:text-white ml-1"><Edit3 className="w-3 h-3 inline"/></button>
                        </span>
                      )}
                      <button onClick={() => handleDelete('movimentacoes', m.id)} className="text-zinc-600 hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Genérico */}
      {modal && (
        <div onClick={() => setModal(null)} className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-[#111] border border-zinc-800 rounded-2xl p-4" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold">{modal.titulo || 'Visualização'}</h3>
              <button onClick={() => setModal(null)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {modal.tipo === 'imagem' ? <img src={modal.conteudo} alt="Print" className="w-full max-h-[70vh] object-contain rounded-lg" /> : <p className="text-zinc-300 text-sm whitespace-pre-wrap">{modal.conteudo}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
