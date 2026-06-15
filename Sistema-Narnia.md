# Nárnia Club - Documentação do Sistema

Este documento detalha o funcionamento, a estrutura de pastas, a arquitetura e o banco de dados do **Nárnia Club - Sistema de Reservas**. Trata-se da plataforma oficial (ponta a ponta) para gerir reservas, entradas, bilheteria e camarotes do clube.

---

## 1. Visão Geral

O sistema é construído utilizando as seguintes tecnologias principais:
- **Frontend:** Next.js 15, React 19, Tailwind CSS 4, Lucide React (Ícones), Framer Motion (Animações).
- **Backend/Database:** Supabase (PostgreSQL, Auth, Storage, Edge Functions RPC).
- **Linguagem:** TypeScript.

### Principais Módulos do Sistema:
1. **App (Cliente):** Interface voltada ao usuário final, onde os clientes visualizam os eventos e agendam suas reservas/camarotes (Localizado na raiz, ex: `app/page.tsx`).
2. **Admin (Dashboard):** Painel administrativo focado na gestão de Eventos, Bilheteria (Lotes), Cortesias, Reservas de Mesas e Camarotes.
3. **Portaria:** Sistema operacional para check-in no dia do evento, controle de lotação, adição rápida de clientes na porta e validação de ingressos.

---

## 2. Estrutura de Diretórios e Arquivos

O projeto segue a estrutura base do `App Router` do Next.js:

- `/app` - Rotas da aplicação.
  - `/admin` - Rota privada do painel administrativo.
  - `/api` - Endpoints backend (se existirem middlewares/APIs externas).
  - `/ativar` - Fluxo de ativação/cadastro.
  - `/components` - Componentes visuais globais (UI components).
  - `/login` - Autenticação da equipe (Admin/Portaria).
  - `/portaria` - Interface da equipe de check-in na porta.
- `/src/services` - Camada de integração direta com o Supabase. Isola a lógica do banco de dados (ex: `reservations.ts`, `ticketing.ts`, `camarotes.ts`, `events.ts`, `customers.ts`, `complimentary.ts`, `blacklist.ts`, `storage.ts`).
- `/src/schemas` - Validações de formulários com Zod (ex: `reservationSchema.ts`).
- `/hooks` - Hooks customizados com a lógica de negócio do React (ex: `useAdminDashboard`, `usePortariaCheckIn`, `useReservationActions`).
- `/lib` - Utilidades gerais, formatações de data e configurações do cliente/servidor do Supabase.
- `/supabase/migrations` - Arquivos de migração SQL contendo toda a evolução do banco, regras de RLS (Row Level Security) e RPCs (Stored Procedures).

---

## 3. Estrutura do Banco de Dados (Supabase/PostgreSQL)

A arquitetura do banco segue um modelo relacional, fortemente tipado e com segurança gerenciada pelo Row Level Security (RLS) do Supabase. Abaixo estão as tabelas principais e seus propósitos:

### `events` (Eventos)
A entidade central do sistema (arquitetura orientada a eventos). Tudo gravita em torno de um evento específico.
- **Campos principais:** `id`, `name`, `event_date`, `start_time`, `description`, `image_url`, `banner_url`, `visible_from`, `list_limit_capacity`, `list_limit_time`, `available_camarotes`.

### `customers` (Clientes)
Armazena o perfil dos clientes do Nárnia Club.
- **Campos principais:** `id`, `name`, `whatsapp`, `cpf`, `email`, `birth_date`, `photo`.

### `reservations` (Reservas e Listas)
Responsável por listas VIPs, reservas de mesas ou convidados normais.
- **Campos principais:** `id`, `customer_id` (Relacionado a customers), `reservation_date`, `reservation_time`, `num_guests`, `status`, `check_in_status` (Para portaria), `payment_status`, `type`.

### `camarotes` (Camarotes / Private Boxes)
Gerencia os espaços de camarote de um evento e quem é o dono.
- **Campos principais:** `id`, `name`, `capacity`, `event_date`, `owner_customer_id` (Relaciona com Customers).

### `camarote_entries` (Acessos aos Camarotes)
Tabela de log de portaria. Quem entrou no camarote, quando e autorizado por quem.
- **Campos principais:** `id`, `camarote_id`, `customer_id`, `is_extra`, `entered_at`, `authorized_by`.

### `ticket_batches` (Lotes de Ingressos/Bilheteria)
Controle de precificação de ingressos por lote.
- **Campos principais:** `id`, `event_id`, `name`, `price`, `total_quantity`, `consumed_quantity`, `status`, `batch_order`.

### `complimentary_tickets` (Cortesias / Free Passes)
Ingressos doados, listas de sócios ou promoters.
- **Campos principais:** `id`, `event_id`, `customer_id`, `status`, `requested_by`, `approved_by`, `notes`.

### `box_office_reports` (Relatórios de Fechamento de Caixa)
Snapshot tirado ao fechar o caixa da noite.
- **Campos principais:** `id`, `event_date`, `total_revenue`, `total_bracelets_sold`, `total_complimentary`, `closed_at`, `closed_by`, `snapshot_data` (JSON).

### `blacklist` (Lista de Banidos)
Clientes proibidos de entrar na casa.
- **Campos principais:** `id`, `cpf`, `name`, `reason`, `start_date`, `end_date`, `blocked_by`.

### `team_members` (Equipe)
Funcionários do clube, incluindo nível de acesso.
- **Campos principais:** `id`, `name`, `email`, `role` (admin, receptionist), `status` (active, pending_invite).

### `whatsapp_templates` (Templates de Mensagens)
Mensagens padrões a serem disparadas via integração (WAPI / Zap).
- **Campos principais:** `id`, `title`, `content`.

---

## 4. Banco de Dados: Stored Procedures (RPCs)
O sistema faz uso pesado de funções SQL (Remote Procedure Calls) no banco para assegurar consistência, transações e evitar problemas de concorrência. Principais RPCs:
- `create_reservation_v2`: Cria uma nova reserva de forma segura.
- `get_reservations_by_cpf` / `get_customer_by_cpf`: Consultas seguras e limitadas.
- `consume_bracelet`: Operação na bilheteria para marcar o ingresso como "consumido" e atualizar lotes disponíveis.
- `register_camarote_entry` / `register_extra_camarote_entry`: Valida e insere a entrada do cliente no camarote pela Portaria.
- `close_box_office`: Finaliza a venda de ingressos e tira o snapshot financeiro da noite.
- `approve_complimentary_ticket`: Workflow de aprovação de cortesias.

## 5. Fluxo de Trabalho e Regras de Negócio

1. **Agendamento pelo Cliente:** O cliente acessa o app, vê a agenda, escolhe a data/evento e entra na "Lista". Uma `reservation` é criada com status "pendente" ou "confirmado" (dependendo da regra de negócio de limite).
2. **Gestão Admin:** O admin configura os lotes da noite em `ticket_batches` e pode aprovar nomes VIPs solicitados inserindo em `complimentary_tickets`.
3. **Noite do Evento (Portaria):** A equipe entra na `/portaria`, seleciona o evento do dia. Quando o cliente chega, buscam o nome/CPF e fazem o **Check-In**, marcando o cliente com `check_in_status`.
4. **Camarote:** Se for camarote, usam `register_camarote_entry` na portaria, conferindo o dono do camarote na tabela `camarotes`.
5. **Fim do Evento:** O Admin encerra a bilheteria na tela de caixa e a RPC gera um `box_office_reports` travando vendas posteriores.
