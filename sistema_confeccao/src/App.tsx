import { useState } from "react"
import * as pdfjsLib from "pdfjs-dist"
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import "./App.css"

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

type Operacao = {
  descricao: string
  tempo: number
  valor: number | null
}

type GrupoEtiqueta =
  | "OVE"
  | "COB3 / RET"
  | "CAS / BOT"

type ItemEtiqueta = {
  grupo: GrupoEtiqueta
  codigo: string
  nome: string
  valor: number
  ordem: number
}

type RegraEtiqueta = {
  grupo: GrupoEtiqueta
  codigo: string
  nome: string
  regex: RegExp
  ordem: number
}

const regrasEtiqueta: RegraEtiqueta[] = [
  // =========================
  // OVE
  // =========================

  {
    grupo: "OVE",
    codigo: "112",
    nome: "Retilinea Mangas",
    regex: /RETILINEA.*MANGAS/,
    ordem: 1,
  },

  {
    grupo: "OVE",
    codigo: "10",
    nome: "Fechar Ombros",
    regex: /FECHAR OMBROS/,
    ordem: 2,
  },

  {
    grupo: "OVE",
    codigo: "11",
    nome: "Pregar Mangas",
    regex: /PREGAR MANGAS/,
    ordem: 3,
  },

  {
    grupo: "OVE",
    codigo: "13",
    nome: "Fechar Lados",
    regex: /EMBUTIR MANGAS E LADOS|FECHAR LADOS/,
    ordem: 4,
  },

  {
    grupo: "OVE",
    codigo: "12",
    nome: "Pregar Gola",
    regex:
      /PREGAR RETILINEA COM TIRA NO DECOTE|PREGAR GOLA/,
    ordem: 5,
  },

  {
    grupo: "OVE",
    codigo: "14",
    nome: "Debrum Manga",
    regex: /DEBRUM.*MANGA/,
    ordem: 6,
  },

  {
    grupo: "OVE",
    codigo: "17",
    nome: "Recorte Manga",
    regex: /RECORTE.*MANGA/,
    ordem: 7,
  },

  {
    grupo: "OVE",
    codigo: "18",
    nome: "Fechar Gola",
    regex: /FECHAR GOLA/,
    ordem: 8,
  },

  // =========================
  // COB3 / RET
  // =========================

  {
    grupo: "COB3 / RET",
    codigo: "30",
    nome: "Bainha Mangas",
    regex: /BAINHAR MANGAS?/,
    ordem: 1,
  },

  {
    grupo: "COB3 / RET",
    codigo: "31",
    nome: "Bainha Barra",
    regex: /BAINHAR BARRA/,
    ordem: 2,
  },

  {
    grupo: "COB3 / RET",
    codigo: "20",
    nome: "Pesp. Decote",
    regex: /^PESPONTAR TIRA$|PESPONTAR.*DECOTE/,
    ordem: 3,
  },

  {
    grupo: "COB3 / RET",
    codigo: "25",
    nome: "Pesp. Mangas",
    regex: /PESPONTAR.*MANGAS/,
    ordem: 4,
  },

  {
    grupo: "COB3 / RET",
    codigo: "22",
    nome: "Pesp. Gola",
    regex: /PESPONTAR.*GOLA/,
    ordem: 5,
  },

  {
    grupo: "COB3 / RET",
    codigo: "28",
    nome: "Travetar Bainha",
    regex: /TRAVET.*BAINHA/,
    ordem: 6,
  },

  // =========================
  // CAS / BOT
  // =========================

  {
    grupo: "CAS / BOT",
    codigo: "40",
    nome: "Pregar Peitilho",
    regex: /PREGAR PEITILHO/,
    ordem: 1,
  },

  {
    grupo: "CAS / BOT",
    codigo: "41",
    nome: "Travetar Peitilho",
    regex: /TRAVET.*PEITILHO/,
    ordem: 2,
  },

  {
    grupo: "CAS / BOT",
    codigo: "50",
    nome: "Caseado",
    regex: /CASEAR/,
    ordem: 3,
  },

  {
    grupo: "CAS / BOT",
    codigo: "51",
    nome: "Botão",
    regex: /PREGAR BOTAO/,
    ordem: 4,
  },
]

function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim()
}

function encontrarPrefixoComum(textos: string[]) {
  if (textos.length === 0) {
    return ""
  }

  let prefixo = textos[0]

  for (let i = 1; i < textos.length; i++) {
    while (!textos[i].startsWith(prefixo)) {
      prefixo = prefixo.slice(0, -1)

      if (prefixo === "") {
        return ""
      }
    }
  }

  const ultimoEspaco = prefixo.lastIndexOf(" ")

  if (ultimoEspaco !== -1) {
    return prefixo.slice(0, ultimoEspaco + 1)
  }

  return prefixo
}

function App() {
  const [fornecedor, setFornecedor] = useState("")
  const [op, setOp] = useState("")
  const [cor, setCor] = useState("")
  const [arquivo, setArquivo] =
    useState<File | null>(null)

  const [operacoes, setOperacoes] =
    useState<Operacao[]>([])

  const [etiquetaGerada, setEtiquetaGerada] =
    useState(false)

  async function lerPdf() {
    if (!fornecedor) {
      alert("Selecione o fornecedor")
      return
    }

    if (!op && fornecedor !== "malwee") {
      alert("Digite a OP")
      return
    }

    if (!cor) {
      alert("Digite a cor")
      return
    }

    if (!arquivo) {
      alert("Selecione um PDF")
      return
    }

    try {
      setOperacoes([])
      setEtiquetaGerada(false)

      const arrayBuffer =
        await arquivo.arrayBuffer()

      const pdf =
        await pdfjsLib.getDocument({
          data: arrayBuffer,
        }).promise

      let textoCompleto = ""

      // Lê todas as páginas
      for (
        let numeroPagina = 1;
        numeroPagina <= pdf.numPages;
        numeroPagina++
      ) {
        const pagina =
          await pdf.getPage(numeroPagina)

        const conteudo =
          await pagina.getTextContent()

        const textoPagina =
          conteudo.items
            .map((item) => {
              if ("str" in item) {
                return item.str
              }

              return ""
            })
            .join(" ")

        textoCompleto +=
          " " + textoPagina
      }

      const texto = textoCompleto
        .replace(/\s+/g, " ")
        .trim()

      if (fornecedor === "malwee") {
        processarMalwee(texto)
      } else {
        alert(
          "A leitura da Elian será configurada depois."
        )
      }
    } catch (erro) {
      console.error(erro)

      alert("Erro ao ler o PDF.")
    }
  }

  function processarMalwee(texto: string) {
    const codigoMaterial =
      texto.match(/\b100000\d+\b/)

    if (!codigoMaterial) {
      alert(
        "Código do material não encontrado."
      )
      return
    }

    const codigoCompleto =
      codigoMaterial[0]

    // Ex:
    // 1000004430 -> 4430

    const opMalwee =
      codigoCompleto.replace(
        /^100000/,
        ""
      )

    setOp(opMalwee)

    const regexCodigo =
      new RegExp(
        `\\b${codigoCompleto}\\b`,
        "g"
      )

    const blocos = texto
      .split(regexCodigo)
      .slice(1)
      .map((bloco) => bloco.trim())

    const linhasEncontradas =
      blocos
        .map((bloco) => {
          const resultadoTempo =
            bloco.match(
              /\b\d+,\d{3}\b/
            )

          if (
            !resultadoTempo ||
            resultadoTempo.index ===
              undefined
          ) {
            return null
          }

          const antesTempo =
            bloco
              .slice(
                0,
                resultadoTempo.index
              )
              .trim()

          return {
            antesTempo,
            tempoTexto:
              resultadoTempo[0],
          }
        })
        .filter(
          (
            linha
          ): linha is {
            antesTempo: string
            tempoTexto: string
          } => linha !== null
        )

    if (
      linhasEncontradas.length === 0
    ) {
      alert(
        "Nenhuma operação encontrada."
      )
      return
    }

    const prefixoProduto =
      encontrarPrefixoComum(
        linhasEncontradas.map(
          (linha) =>
            linha.antesTempo
        )
      )

    const operacoesEncontradas: Operacao[] =
      linhasEncontradas.map(
        (linha) => {
          const descricao =
            linha.antesTempo
              .replace(
                prefixoProduto,
                ""
              )
              .trim()

          const tempo =
            Number(
              linha.tempoTexto.replace(
                ",",
                "."
              )
            )

          const valor =
            tempo > 0
              ? Math.floor(
                  60 / tempo
                )
              : null

          return {
            descricao,
            tempo,
            valor,
          }
        }
      )

    setOperacoes(
      operacoesEncontradas
    )
  }

  function montarItensEtiqueta() {
    const itens: ItemEtiqueta[] = []

    for (const operacao of operacoes) {
      if (
        operacao.valor === null
      ) {
        continue
      }

      const descricaoNormalizada =
        normalizarTexto(
          operacao.descricao
        )

      const regra =
        regrasEtiqueta.find(
          (regra) =>
            regra.regex.test(
              descricaoNormalizada
            )
        )

      if (!regra) {
        continue
      }

      itens.push({
        grupo: regra.grupo,
        codigo: regra.codigo,
        nome: regra.nome,
        valor: operacao.valor,
        ordem: regra.ordem,
      })
    }

    // Remove duplicados
    const mapa =
      new Map<
        string,
        ItemEtiqueta
      >()

    itens.forEach((item) => {
      const chave =
        `${item.grupo}-${item.codigo}-${item.nome}`

      if (!mapa.has(chave)) {
        mapa.set(chave, item)
      }
    })

    return Array.from(
      mapa.values()
    )
  }

  const itensEtiqueta =
    montarItensEtiqueta()

  function gerarEtiqueta() {
    if (
      operacoes.length === 0
    ) {
      alert(
        "Leia o PDF primeiro."
      )
      return
    }

    if (
      itensEtiqueta.length === 0
    ) {
      alert(
        "Nenhuma operação da etiqueta foi encontrada."
      )
      return
    }

    setEtiquetaGerada(true)
  }

  function itensDoGrupo(
    grupo: GrupoEtiqueta
  ) {
    return itensEtiqueta
      .filter(
        (item) =>
          item.grupo === grupo
      )
      .sort(
        (a, b) =>
          a.ordem - b.ordem
      )
  }

  function imprimirEtiqueta() {
    window.print()
  }

  return (
    <div className="pagina">
      <div className="formulario">
        <h1>
          Sistema de Confecção
        </h1>

        <label>
          Fornecedor
        </label>

        <select
          value={fornecedor}
          onChange={(e) => {
            setFornecedor(
              e.target.value
            )

            setEtiquetaGerada(
              false
            )
          }}
        >
          <option value="">
            Selecione
          </option>

          <option value="malwee">
            Malwee
          </option>

          <option value="elian">
            Elian
          </option>
        </select>

        <label>OP</label>

        <input
          type="text"
          value={op}
          onChange={(e) =>
            setOp(
              e.target.value
            )
          }
          placeholder="Digite a OP"
        />

        <label>Cor</label>

        <input
          type="text"
          value={cor}
          onChange={(e) =>
            setCor(
              e.target.value
            )
          }
          placeholder="Ex: NATURAL"
        />

        <label>
          Arquivo PDF
        </label>

        <input
          type="file"
          accept=".pdf"
          onChange={(e) => {
            const arquivoSelecionado =
              e.target
                .files?.[0]

            if (
              arquivoSelecionado
            ) {
              setArquivo(
                arquivoSelecionado
              )

              setEtiquetaGerada(
                false
              )
            }
          }}
        />

        {arquivo && (
          <p className="arquivo">
            Arquivo:{" "}
            {arquivo.name}
          </p>
        )}

        <div className="botoes">
          <button
            onClick={lerPdf}
          >
            Ler PDF
          </button>

          {operacoes.length >
            0 && (
            <button
              onClick={
                gerarEtiqueta
              }
            >
              Gerar etiqueta
            </button>
          )}
        </div>
      </div>

      {operacoes.length >
        0 && (
        <div className="calculos">
          <h2>
            Operações calculadas
          </h2>

          <table>
            <thead>
              <tr>
                <th>
                  Operação
                </th>

                <th>
                  Tempo
                </th>

                <th>
                  PC/H
                </th>
              </tr>
            </thead>

            <tbody>
              {operacoes.map(
                (
                  operacao,
                  index
                ) => (
                  <tr
                    key={index}
                  >
                    <td>
                      {
                        operacao.descricao
                      }
                    </td>

                    <td>
                      {operacao.tempo
                        .toFixed(
                          3
                        )
                        .replace(
                          ".",
                          ","
                        )}
                    </td>

                    <td>
                      {operacao.valor ??
                        "-"}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {etiquetaGerada && (
        <div className="area-etiqueta">
          <div className="etiqueta">
            <div className="titulo-etiqueta">
              A / /
            </div>

            <div className="linha-cabecalho">
              {op}
            </div>

            <div className="linha-cabecalho cor">
              {cor.toUpperCase()}
            </div>

            {(
              [
                "OVE",
                "COB3 / RET",
                "CAS / BOT",
              ] as GrupoEtiqueta[]
            ).map(
              (grupo) => {
                const itens =
                  itensDoGrupo(
                    grupo
                  )

                if (
                  itens.length ===
                  0
                ) {
                  return null
                }

                return (
                  <div
                    key={grupo}
                  >
                    <div className="grupo-etiqueta">
                      {grupo}
                    </div>

                    {itens.map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          className="item-etiqueta"
                          key={`${grupo}-${index}`}
                        >
                          <span>
                            (
                            {
                              item.codigo
                            }
                            ){" "}
                            {
                              item.nome
                            }
                          </span>

                          <strong>
                            {
                              item.valor
                            }
                          </strong>
                        </div>
                      )
                    )}
                  </div>
                )
              }
            )}
          </div>

          <button
            className="botao-imprimir"
            onClick={
              imprimirEtiqueta
            }
          >
            Imprimir etiqueta
          </button>
        </div>
      )}
    </div>
  )
}

export default App