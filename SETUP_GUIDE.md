# Jenkins + Kubernetes Setup Guide

This guide provides step-by-step instructions to set up Jenkins with Kubernetes deployment on your Linux server accessed via PuTTY.

## Prerequisites

- Linux server (Ubuntu 20.04+ or CentOS 7+)
- SSH access via PuTTY
- Sudo privileges on the server

## Part 1: Server Setup Commands (Run via PuTTY)

### 1. Update System Packages

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget apt-transport-https ca-certificates gnupg lsb-release software-properties-common
```

### 2. Install Docker

```bash
# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add current user to docker group
sudo usermod -aG docker $USER

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Test Docker installation
docker --version
```

### 3. Install Kubernetes Tools (kubectl)

```bash
# Download kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Install kubectl
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Verify installation
kubectl version --client
```

### 4. Install Minikube (for local Kubernetes cluster)

```bash
# Download and install Minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Start Minikube
minikube start --driver=docker

# Verify Minikube is running
kubectl cluster-info
kubectl get nodes
```

### 5. Install Jenkins

```bash
# Add Jenkins repository key
wget -q -O - https://pkg.jenkins.io/debian-stable/jenkins.io.key | sudo apt-key add -

# Add Jenkins repository
sudo sh -c 'echo deb http://pkg.jenkins.io/debian-stable binary/ > /etc/apt/sources.list.d/jenkins.list'

# Install Java (required for Jenkins)
sudo apt update
sudo apt install -y openjdk-11-jdk

# Install Jenkins
sudo apt install -y jenkins

# Start and enable Jenkins
sudo systemctl start jenkins
sudo systemctl enable jenkins

# Check Jenkins status
sudo systemctl status jenkins

# Get initial admin password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

### 6. Install AWS CLI (for ECR access)

```bash
# Download and install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo apt install -y unzip
unzip awscliv2.zip
sudo ./aws/install

# Verify installation
aws --version
```

### 7. Configure Firewall (if needed)

```bash
# Open required ports
sudo ufw allow 8080/tcp    # Jenkins
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS

# Enable firewall
sudo ufw --force enable
```

## Part 2: Jenkins Configuration

### 1. Access Jenkins Web Interface

1. Open your web browser
2. Navigate to `http://YOUR_SERVER_IP:8080`
3. Use the initial admin password from step 5 above
4. Install suggested plugins

### 2. Install Required Jenkins Plugins

Go to **Manage Jenkins** → **Manage Plugins** → **Available** and install:

- Docker Pipeline
- Kubernetes
- Kubernetes CLI
- Amazon ECR
- AWS Steps
- Pipeline: Stage View
- Blue Ocean (optional, for better UI)

### 3. Configure Global Tools

Go to **Manage Jenkins** → **Global Tool Configuration**:

#### Docker:
- Name: `docker`
- Installation method: Install automatically
- Version: Latest

#### kubectl:
- Name: `kubectl`
- Install automatically: Checked
- Version: Latest stable

### 4. Add Credentials

Go to **Manage Jenkins** → **Manage Credentials** → **System** → **Global credentials**:

#### Docker Hub Credentials:
- Kind: Username with password
- ID: `Docker_Credentials`
- Username: Your Docker Hub username
- Password: Your Docker Hub password/token

#### AWS Credentials:
- Kind: AWS Credentials
- ID: `AWS_Credentials`
- Access Key ID: Your AWS access key
- Secret Access Key: Your AWS secret key

#### Kubernetes Config (if using external cluster):
- Kind: Secret file
- ID: `kubeconfig`
- File: Upload your kubeconfig file

## Part 3: Kubernetes Cluster Setup

### Option A: Using Minikube (Local Development)

```bash
# Start Minikube with more resources
minikube start --memory=4096 --cpus=2 --driver=docker

# Enable ingress addon (optional)
minikube addons enable ingress

# Get Minikube IP
minikube ip
```

### Option B: Using External Kubernetes Cluster (Production)

If you're using AWS EKS, GKE, or AKS:

```bash
# For AWS EKS
aws eks update-kubeconfig --region ap-south-1 --name your-cluster-name

# For Google GKE
gcloud container clusters get-credentials your-cluster-name --zone your-zone

# For Azure AKS
az aks get-credentials --resource-group your-rg --name your-cluster-name
```

## Part 4: Deploy Your Application

### 1. Manual Kubernetes Deployment (Testing)

```bash
# Clone your repository
git clone https://github.com/aryankhanelwal/Academic_Deadline.git
cd Academic_Deadline

# Create secrets manually for testing
kubectl create secret generic app-secrets \
    --from-literal=SESSION_SECRET='a3b2f8d23c84c5eaf8dca92b21a1c9d739e24c88b9db19e88b0d4f5e7e1c6f9d' \
    --from-literal=EMAIL_USER='2002ak2002@gmail.com' \
    --from-literal=EMAIL_PASS='prgi uvhi dpri wlaz' \
    --from-literal=TWILIO_ACCOUNT_SID='ACee47a780e6b96d14076c87aa3fdaab64' \
    --from-literal=TWILIO_AUTH_TOKEN='5436b2ee490659bc2b55e369d1cc0d3e' \
    --from-literal=TWILIO_PHONE_NUMBER='+18788812691'

# Apply Kubernetes manifests
kubectl apply -f k8s-deployment.yaml

# Check deployment status
kubectl get pods,services
kubectl logs -f deployment/academic-deadline-app
```

### 2. Access Your Application

```bash
# If using Minikube
minikube service academic-deadline-app --url

# If using LoadBalancer
kubectl get service academic-deadline-app
```

## Part 5: Jenkins Pipeline Usage

### 1. Create a New Pipeline Job

1. In Jenkins dashboard, click **New Item**
2. Enter name: `Academic-Deadline-Pipeline`
3. Select **Pipeline**
4. Click **OK**

### 2. Configure Pipeline

In the job configuration:

1. **Pipeline Definition**: Pipeline script from SCM
2. **SCM**: Git
3. **Repository URL**: `https://github.com/aryankhanelwal/Academic_Deadline.git`
4. **Branch**: `*/master`
5. **Script Path**: `Jenkinsfile`

### 3. Run the Pipeline

1. Click **Build with Parameters**
2. Set your desired parameters:
   - `IMAGE_TAG`: e.g., `v1.0`
   - `DEPLOYMENT_TYPE`: Choose `kubernetes`, `docker-compose`, or `both`
   - `K8S_NAMESPACE`: `default` or your preferred namespace
3. Click **Build**

## Part 6: Useful Commands for Monitoring

### Check Application Status

```bash
# Check all resources
kubectl get all

# Check pod logs
kubectl logs -f deployment/academic-deadline-app

# Check service endpoints
kubectl get endpoints

# Describe pod for troubleshooting
kubectl describe pod $(kubectl get pods -l app=academic-deadline-app -o jsonpath='{.items[0].metadata.name}')
```

### Scale Application

```bash
# Scale manually
kubectl scale deployment academic-deadline-app --replicas=3

# Check HPA status
kubectl get hpa
```

### Update Application

```bash
# Update image (when new version is pushed)
kubectl set image deployment/academic-deadline-app app=YOUR_ECR_REPO:NEW_TAG

# Check rollout status
kubectl rollout status deployment/academic-deadline-app
```

## Part 7: Troubleshooting

### Common Issues and Solutions

1. **Jenkins can't connect to Docker**:
   ```bash
   sudo usermod -aG docker jenkins
   sudo systemctl restart jenkins
   ```

2. **kubectl not found in Jenkins**:
   - Ensure kubectl is in PATH: `sudo ln -s /usr/local/bin/kubectl /usr/bin/kubectl`

3. **Permission denied for kubeconfig**:
   ```bash
   sudo chown jenkins:jenkins /home/jenkins/.kube/config
   sudo chmod 600 /home/jenkins/.kube/config
   ```

4. **Minikube not accessible from Jenkins**:
   ```bash
   # Copy Minikube config to Jenkins user
   sudo mkdir -p /var/lib/jenkins/.kube
   sudo cp ~/.kube/config /var/lib/jenkins/.kube/
   sudo chown -R jenkins:jenkins /var/lib/jenkins/.kube
   ```

## Part 8: Security Best Practices

1. **Use Kubernetes Secrets** for sensitive data (already implemented in the pipeline)
2. **Enable RBAC** in your Kubernetes cluster
3. **Use namespaces** to isolate environments
4. **Regular updates** of all components
5. **Monitor logs** and set up alerts

## Part 9: Monitoring Setup (Optional)

### Install Kubernetes Dashboard

```bash
# Deploy dashboard
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# Create admin user
kubectl create serviceaccount admin-user --namespace kubernetes-dashboard
kubectl create clusterrolebinding admin-user --clusterrole=cluster-admin --serviceaccount=kubernetes-dashboard:admin-user

# Get access token
kubectl -n kubernetes-dashboard create token admin-user

# Access dashboard
kubectl proxy
# Then open: http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
```

## Next Steps

1. Test the pipeline with different deployment types
2. Set up monitoring and logging
3. Configure backup strategies for MongoDB data
4. Implement CI/CD best practices
5. Set up staging and production environments

---

**Note**: Replace placeholder values (YOUR_SERVER_IP, your-cluster-name, etc.) with your actual values.
