# Painel Administrativo e Setup

O painel do AniStream usa o Kenjitsu self-hosted como fonte única de catálogo, metadados, episódios e mídia.

## Setup inicial

O assistente /setup tem quatro etapas:

1. validar a chave de instalação e a conexão PostgreSQL;
2. criar a conta do administrador;
3. confirmar a integração com a API Kenjitsu;
4. concluir e abrir o painel de extensões.

Não existe mais configuração de hosts de mídia, importação M3U, cadastro de URL de stream ou escolha de provedores externos no setup. O Kenjitsu retorna os hosts de reprodução e a aplicação mantém somente a proteção SSRF contra protocolos, portas e redes privadas.

## Painel de extensões

/admin/extensions é o ponto central para as fontes. Cada extensão pode ser:

- ativada ou desativada;
- bloqueada ou liberada para NSFW;
- testada individualmente;
- acompanhada por status, latência, versão, origem e capacidades do manifest.

As extensões são registradas no Kenjitsu self-hosted e podem ser atualizadas nos forks locais sem alterar os repositórios oficiais.

## Catálogo e episódios

/admin/animes continua permitindo gerenciar o catálogo local e seus episódios. O modal de fontes do episódio consulta as extensões habilitadas em tempo real e permite testar os candidatos no player inline.

URLs manuais e a persistência de fontes externas foram desativadas para manter o fluxo exclusivamente Kenjitsu. Registros legados ainda podem ser visualizados, desativados ou removidos quando necessário.

## Rotas administrativas

| Rota | Função |
| :--- | :--- |
| /admin/login | Login do administrador. |
| /setup | Instalação inicial sem configuração de hosts. |
| /admin/extensions | Ativação, bloqueio NSFW, health check e teste das extensões Kenjitsu. |
| /admin/animes | Catálogo local e episódios. |
| /admin/animes/[id]/editar | Metadados, episódios e descoberta ao vivo de fontes. |
| /admin/sources | Rota legada que redireciona para /admin/extensions. |

### Endpoints relacionados a fontes

- GET /api/admin/extensions — lista extensões, manifest e status.
- PATCH /api/admin/extensions — altera enabled e nsfw.
- POST /api/admin/extensions — testa uma extensão.
- POST /api/admin/animes/[id]/episodes/[epId]/discover-sources — consulta fontes ao vivo pelo Kenjitsu.
- POST /api/admin/animes/[id]/episodes/[epId]/sources — retorna 410; fontes manuais não fazem parte da arquitetura atual.
- GET /api/admin/sources — consulta registros antigos para manutenção.
