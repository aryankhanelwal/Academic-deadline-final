#!/bin/bash

# Kubernetes Troubleshooting Script for Jenkins
# Run this on your server via PuTTY to fix authentication issues

set -e

echo "🔧 Kubernetes Troubleshooting Script"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

print_status "Step 1: Checking system components..."

# Check if kubectl is installed
if command_exists kubectl; then
    print_status "kubectl is installed: $(kubectl version --client --short 2>/dev/null || echo 'version check failed')"
else
    print_error "kubectl is not installed or not in PATH"
    exit 1
fi

# Check if minikube is installed
if command_exists minikube; then
    print_status "minikube is installed: $(minikube version --short 2>/dev/null || echo 'version check failed')"
else
    print_warning "minikube is not installed"
fi

# Check if docker is running
if command_exists docker; then
    if docker info >/dev/null 2>&1; then
        print_status "Docker is running"
    else
        print_error "Docker is not running or not accessible"
        print_status "Starting Docker..."
        sudo systemctl start docker
    fi
else
    print_error "Docker is not installed"
    exit 1
fi

print_status "Step 2: Checking Kubernetes cluster status..."

# Check if minikube is running
if command_exists minikube; then
    if minikube status >/dev/null 2>&1; then
        print_status "Minikube is running"
        MINIKUBE_RUNNING=true
    else
        print_warning "Minikube is not running"
        MINIKUBE_RUNNING=false
    fi
else
    MINIKUBE_RUNNING=false
fi

# Check kubectl connectivity
print_debug "Testing kubectl connectivity..."
if kubectl cluster-info >/dev/null 2>&1; then
    print_status "kubectl can connect to Kubernetes cluster"
    kubectl cluster-info
else
    print_error "kubectl cannot connect to Kubernetes cluster"
    
    if [ "$MINIKUBE_RUNNING" = false ]; then
        print_status "Starting Minikube..."
        minikube start --driver=docker --memory=4096 --cpus=2
        
        # Wait for cluster to be ready
        print_status "Waiting for cluster to be ready..."
        kubectl wait --for=condition=Ready nodes --all --timeout=300s
    fi
fi

print_status "Step 3: Fixing Jenkins user permissions..."

# Check if Jenkins user exists
if id jenkins >/dev/null 2>&1; then
    print_status "Jenkins user exists"
    
    # Add jenkins to docker group
    print_status "Adding jenkins user to docker group..."
    sudo usermod -aG docker jenkins
    
    # Create .kube directory for jenkins user
    print_status "Setting up kubectl config for Jenkins user..."
    sudo mkdir -p /var/lib/jenkins/.kube
    
    # Copy current user's kubectl config to jenkins
    if [ -f ~/.kube/config ]; then
        sudo cp ~/.kube/config /var/lib/jenkins/.kube/config
        sudo chown -R jenkins:jenkins /var/lib/jenkins/.kube
        sudo chmod 600 /var/lib/jenkins/.kube/config
        print_status "Copied kubectl config to Jenkins user"
    else
        print_error "No kubectl config found for current user"
        
        # Generate config from minikube
        if command_exists minikube; then
            print_status "Generating kubectl config from Minikube..."
            minikube kubectl -- config view --flatten > /tmp/kubeconfig
            sudo cp /tmp/kubeconfig /var/lib/jenkins/.kube/config
            sudo chown -R jenkins:jenkins /var/lib/jenkins/.kube
            sudo chmod 600 /var/lib/jenkins/.kube/config
            rm /tmp/kubeconfig
            print_status "Generated kubectl config for Jenkins user"
        fi
    fi
    
    # Test kubectl as jenkins user
    print_status "Testing kubectl access as jenkins user..."
    if sudo -u jenkins kubectl cluster-info >/dev/null 2>&1; then
        print_status "✅ Jenkins user can access Kubernetes cluster"
    else
        print_error "❌ Jenkins user cannot access Kubernetes cluster"
        
        # Additional troubleshooting
        print_debug "Jenkins user kubectl config:"
        sudo -u jenkins kubectl config view || true
        
        print_debug "Checking file permissions:"
        ls -la /var/lib/jenkins/.kube/ || true
    fi
    
else
    print_error "Jenkins user does not exist"
    exit 1
fi

print_status "Step 4: Testing Kubernetes operations..."

# Test basic kubectl operations
print_debug "Testing kubectl get nodes..."
kubectl get nodes || true

print_debug "Testing kubectl get namespaces..."
kubectl get namespaces || true

# Create test namespace
print_status "Testing namespace creation..."
kubectl create namespace test-jenkins --dry-run=client -o yaml | kubectl apply -f - || true

# Test secret creation
print_status "Testing secret creation..."
kubectl create secret generic test-secret \
    --from-literal=test=value \
    --namespace=test-jenkins \
    --dry-run=client -o yaml | kubectl apply -f - || true

# Clean up test resources
kubectl delete namespace test-jenkins --ignore-not-found=true

print_status "Step 5: Restarting Jenkins..."
sudo systemctl restart jenkins

print_status "Step 6: Final verification..."
sleep 10

# Test as jenkins user one more time
if sudo -u jenkins kubectl cluster-info >/dev/null 2>&1; then
    print_status "🎉 SUCCESS: Jenkins user can now access Kubernetes!"
    
    print_status "Next steps:"
    echo "1. Go to Jenkins dashboard"
    echo "2. Run your pipeline again"
    echo "3. Choose 'kubernetes' as deployment type"
    echo "4. Monitor the console output"
    
else
    print_error "❌ FAILED: Jenkins user still cannot access Kubernetes"
    
    print_status "Manual troubleshooting steps:"
    echo "1. Check Jenkins logs: sudo journalctl -u jenkins -f"
    echo "2. Verify kubectl config: sudo -u jenkins kubectl config view"
    echo "3. Check file permissions: ls -la /var/lib/jenkins/.kube/"
    echo "4. Restart minikube: minikube stop && minikube start"
fi

print_status "Troubleshooting completed!"
echo ""
print_status "Useful debugging commands:"
echo "- Check Jenkins status: sudo systemctl status jenkins"
echo "- Check Minikube status: minikube status"
echo "- Check kubectl as jenkins: sudo -u jenkins kubectl cluster-info"
echo "- View Jenkins logs: sudo journalctl -u jenkins -f"
echo "- Check docker access: sudo -u jenkins docker ps"
