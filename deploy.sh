#!/bin/bash

# Script de deploy para Seraph's Last Stand
# Uso: ./deploy.sh [build|start|stop|restart|logs|clean]

set -e

PROJECT_NAME="seraph-last-stand"
DOMAIN="seraph.alexsandrof.com.br"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logs coloridos
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Verificar se Docker está rodando
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        error "Docker não está rodando. Por favor, inicie o Docker primeiro."
        exit 1
    fi
}

# Verificar se arquivo .env.local existe
check_env() {
    if [ ! -f ".env.local" ]; then
        warn "Arquivo .env.local não encontrado. Criando arquivo de exemplo..."
        cat > .env.local << EOF
GEMINI_API_KEY=sua_chave_api_aqui
EOF
        warn "Por favor, edite o arquivo .env.local com sua chave da API do Gemini"
    fi
}

# Build da aplicação
build_app() {
    log "Iniciando build da aplicação..."
    check_env
    
    log "Parando containers existentes..."
    docker-compose down 2>/dev/null || true
    
    log "Fazendo build da imagem Docker..."
    docker-compose build --no-cache
    
    log "Build concluído com sucesso!"
}

# Iniciar aplicação
start_app() {
    log "Iniciando aplicação..."
    check_docker
    
    # Criar diretório de logs se não existir
    mkdir -p logs
    
    docker-compose up -d
    
    log "Aplicação iniciada!"
    info "Acesse: http://$DOMAIN"
    info "Para ver logs: ./deploy.sh logs"
}

# Parar aplicação
stop_app() {
    log "Parando aplicação..."
    docker-compose down
    log "Aplicação parada!"
}

# Reiniciar aplicação
restart_app() {
    log "Reiniciando aplicação..."
    stop_app
    start_app
}

# Ver logs
show_logs() {
    info "Mostrando logs da aplicação (Ctrl+C para sair)..."
    docker-compose logs -f
}

# Limpeza completa
clean_all() {
    warn "Isso irá remover todos os containers, imagens e volumes relacionados ao projeto."
    read -p "Tem certeza? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Limpando containers..."
        docker-compose down -v
        
        log "Removendo imagens..."
        docker rmi $(docker images | grep $PROJECT_NAME | awk '{print $3}') 2>/dev/null || true
        
        log "Limpeza concluída!"
    else
        info "Operação cancelada."
    fi
}

# Status da aplicação
status_app() {
    info "Status dos containers:"
    docker-compose ps
    
    echo ""
    info "Logs recentes:"
    docker-compose logs --tail=10
}

# Backup dos logs
backup_logs() {
    if [ -d "logs" ]; then
        BACKUP_DIR="backup_logs_$(date +%Y%m%d_%H%M%S)"
        log "Criando backup dos logs em $BACKUP_DIR..."
        cp -r logs $BACKUP_DIR
        log "Backup criado: $BACKUP_DIR"
    else
        warn "Diretório de logs não encontrado."
    fi
}

# Setup SSL com Let's Encrypt (opcional)
setup_ssl() {
    warn "Configuração SSL ainda não implementada neste script."
    info "Para configurar SSL:"
    info "1. Instale certbot"
    info "2. Execute: certbot certonly --standalone -d $DOMAIN"
    info "3. Descomente as seções HTTPS no nginx.conf"
    info "4. Reinicie o container"
}

# Help
show_help() {
    echo "Script de deploy para Seraph's Last Stand"
    echo ""
    echo "Uso: $0 [COMANDO]"
    echo ""
    echo "Comandos disponíveis:"
    echo "  build     - Faz build da aplicação"
    echo "  start     - Inicia a aplicação"
    echo "  stop      - Para a aplicação"
    echo "  restart   - Reinicia a aplicação"
    echo "  logs      - Mostra logs em tempo real"
    echo "  status    - Mostra status dos containers"
    echo "  backup    - Faz backup dos logs"
    echo "  clean     - Remove todos os containers e imagens"
    echo "  ssl       - Informações sobre configuração SSL"
    echo "  help      - Mostra esta ajuda"
    echo ""
    echo "Exemplo: $0 build && $0 start"
}

# Main
case "${1:-help}" in
    build)
        build_app
        ;;
    start)
        start_app
        ;;
    stop)
        stop_app
        ;;
    restart)
        restart_app
        ;;
    logs)
        show_logs
        ;;
    status)
        status_app
        ;;
    backup)
        backup_logs
        ;;
    clean)
        clean_all
        ;;
    ssl)
        setup_ssl
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        error "Comando inválido: $1"
        show_help
        exit 1
        ;;
esac
