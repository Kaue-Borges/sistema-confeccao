import { useState } from "react"
import * as pdfjsLib from "pdfjs-dist"
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url"

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

type Operacao = {
  descricao: string
  tempo: number
  valor: number | null
}

function App() {
  const [fornecedor, setFornecedor] = useState("")
  const [op, setOp] = useState("")
  const [cor, setCor] = useState("")
  const [arquivo, setArquivo] = useState<File | null>(null)

  const [operacoes, setOperacoes] = useState<Operacao[]>([])

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

    // Evita cortar no meio de uma palavra
    const ultimoEspaco = prefixo.lastIndexOf(" ")

    if (ultimoEspaco !== -1) {
      return prefixo.slice(0, ultimoEspaco + 1)
    }

    return prefixo
  }

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

      const arrayBuffer = await arquivo.arrayBuffer()

      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
      }).promise

      let textoCompleto = ""

      // Lê todas as páginas do PDF
      for (
        let numeroPagina = 1;
        numeroPagina <= pdf.numPages;
        numeroPagina++
      ) {
        const pagina = await pdf.getPage(numeroPagina)

        const conteudo = await pagina.getTextContent()

        const textoPagina = conteudo.items
          .map((item) => {
            if ("str" in item) {
              return item.str
            }

            return ""
          })
          .join(" ")

        textoCompleto += " " + textoPagina
      }

      // Remove espaços duplicados
      const texto = textoCompleto
        .replace(/\s+/g, " ")
        .trim()

      if (fornecedor === "malwee") {
        processarMalwee(texto)
      } else {
        alert(
          "A leitura automática da Elian será configurada depois."
        )
      }
    } catch (erro) {
      console.error(erro)

      alert("Erro ao ler o PDF.")
    }
  }

  function processarMalwee(texto: string) {
    // Encontra código como 1000004430
    const codigoMaterial = texto.match(/\b100000\d+\b/)

    if (!codigoMaterial) {
      alert("Não foi possível encontrar o código do material.")
      return
    }

    const codigoCompleto = codigoMaterial[0]

    // 1000004430 -> 4430
    const opMalwee = codigoCompleto.replace(/^100000/, "")

    setOp(opMalwee)

    /*
      Divide o PDF em blocos.

      Exemplo:

      1000004430
      CAMISA POLO ESSENCIAL ORIGINAL
      BAINHAR MANGAS (2 CM, 2AG)
      0,458
    */

    const regexCodigo = new RegExp(
      `\\b${codigoCompleto}\\b`,
      "g"
    )

    const blocos = texto
      .split(regexCodigo)
      .slice(1)
      .map((bloco) => bloco.trim())

    /*
      Primeiro identificamos o texto antes de cada tempo.

      Assim conseguimos descobrir automaticamente
      qual é a descrição do produto e qual é a operação.
    */

    const linhasEncontradas = blocos
      .map((bloco) => {
        const resultadoTempo = bloco.match(
          /\b\d+,\d{3}\b/
        )

        if (
          !resultadoTempo ||
          resultadoTempo.index === undefined
        ) {
          return null
        }

        const antesTempo = bloco
          .slice(0, resultadoTempo.index)
          .trim()

        return {
          antesTempo,
          tempoTexto: resultadoTempo[0],
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

    if (linhasEncontradas.length === 0) {
      alert("Nenhuma operação foi encontrada.")
      return
    }

    /*
      Todas as linhas começam com algo como:

      CAMISA POLO ESSENCIAL ORIGINAL

      Descobrimos esse prefixo automaticamente.
    */

    const prefixoProduto = encontrarPrefixoComum(
      linhasEncontradas.map(
        (linha) => linha.antesTempo
      )
    )

    const operacoesEncontradas: Operacao[] =
      linhasEncontradas.map((linha) => {
        const descricao = linha.antesTempo
          .replace(prefixoProduto, "")
          .trim()

        const tempo = Number(
          linha.tempoTexto.replace(",", ".")
        )

        /*
          Regra atual:

          peças por hora = 60 / tempo

          Math.floor remove as casas decimais.
        */

        const valor =
          tempo > 0
            ? Math.floor(60 / tempo)
            : null

        return {
          descricao,
          tempo,
          valor,
        }
      })

    setOperacoes(operacoesEncontradas)
  }

  return (
    <div>
      <h1>Sistema de Confecção</h1>

      <label>Fornecedor</label>
      <br />

      <select
        value={fornecedor}
        onChange={(e) =>
          setFornecedor(e.target.value)
        }
      >
        <option value="">Selecione</option>
        <option value="malwee">Malwee</option>
        <option value="elian">Elian</option>
      </select>

      <br />
      <br />

      <label>OP</label>
      <br />

      <input
        type="text"
        value={op}
        onChange={(e) => setOp(e.target.value)}
        placeholder="Digite a OP"
      />

      <br />
      <br />

      <label>Cor</label>
      <br />

      <input
        type="text"
        value={cor}
        onChange={(e) => setCor(e.target.value)}
        placeholder="Ex: NATURAL"
      />

      <br />
      <br />

      <label>Arquivo PDF</label>
      <br />

      <input
        type="file"
        accept=".pdf"
        onChange={(e) => {
          const arquivoSelecionado =
            e.target.files?.[0]

          if (arquivoSelecionado) {
            setArquivo(arquivoSelecionado)
          }
        }}
      />

      {fornecedor && (
        <p>
          Fornecedor selecionado: {fornecedor}
        </p>
      )}

      {op && <p>OP: {op}</p>}

      {cor && <p>Cor: {cor}</p>}

      {arquivo && (
        <p>
          Arquivo selecionado: {arquivo.name}
        </p>
      )}

      <br />

      <button onClick={lerPdf}>
        Ler PDF
      </button>

      {operacoes.length > 0 && (
        <div>
          <h2>Operações encontradas</h2>

          <table
            border={1}
            cellPadding={8}
            style={{
              borderCollapse: "collapse",
              margin: "0 auto",
            }}
          >
            <thead>
              <tr>
                <th>Operação</th>
                <th>Tempo</th>
                <th>Valor calculado</th>
              </tr>
            </thead>

            <tbody>
              {operacoes.map(
                (operacao, index) => (
                  <tr key={index}>
                    <td>
                      {operacao.descricao}
                    </td>

                    <td>
                      {operacao.tempo
                        .toFixed(3)
                        .replace(".", ",")}
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
    </div>
  )
}

export default App