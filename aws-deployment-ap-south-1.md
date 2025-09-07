# AWS Deployment Commands for ap-south-1 Region

This document contains all the AWS-specific deployment commands configured for the **ap-south-1** (Asia Pacific - Mumbai) region.

## 📍 Region Configuration
- **AWS Region**: `ap-south-1` (Asia Pacific - Mumbai)
- **AWS Account ID**: `698031349056`
- **ECR Repository**: `698031349056.dkr.ecr.ap-south-1.amazonaws.com`

## 🚀 Quick Start Deployment Commands

### 1. Create EKS Cluster (ap-south-1)
```bash
eksctl create cluster \
  --name academic-deadline-cluster \
  --version 1.28 \
  --region ap-south-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 5 \
  --managed \
  --with-oidc \
  --ssh-access \
  --ssh-public-key your-key-name
```

### 2. Configure kubectl for ap-south-1
```bash
aws eks update-kubeconfig --region ap-south-1 --name academic-deadline-cluster
kubectl get nodes
```

### 3. Install AWS Load Balancer Controller (ap-south-1)
```bash
# Create IAM policy
curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.6.0/docs/install/iam_policy.json
aws iam create-policy --policy-name AWSLoadBalancerControllerIAMPolicy --policy-document file://iam_policy.json

# Create service account
eksctl create iamserviceaccount \
  --cluster=academic-deadline-cluster \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --role-name AmazonEKSLoadBalancerControllerRole \
  --attach-policy-arn=arn:aws:iam::698031349056:policy/AWSLoadBalancerControllerIAMPolicy \
  --region=ap-south-1 \
  --approve

# Install with Helm
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# Get VPC ID for ap-south-1 cluster
VPC_ID=$(aws eks describe-cluster --name academic-deadline-cluster --region ap-south-1 --query "cluster.resourcesVpcConfig.vpcId" --output text)

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=academic-deadline-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set region=ap-south-1 \
  --set vpcId=$VPC_ID
```

### 4. Install EBS CSI Driver (ap-south-1)
```bash
eksctl create iamserviceaccount \
  --name ebs-csi-controller-sa \
  --namespace kube-system \
  --cluster academic-deadline-cluster \
  --region ap-south-1 \
  --attach-policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy \
  --approve \
  --override-existing-serviceaccounts

aws eks create-addon --cluster-name academic-deadline-cluster --addon-name aws-ebs-csi-driver --region ap-south-1
```

### 5. Create ECR Repository (ap-south-1)
```bash
# Create ECR repository
aws ecr create-repository --repository-name academic-deadline-app --region ap-south-1

# Get login token
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 698031349056.dkr.ecr.ap-south-1.amazonaws.com
```

### 6. Build and Push Docker Image
```bash
# Build image
docker build -t academic-deadline-app:latest .

# Tag for ECR (ap-south-1)
docker tag academic-deadline-app:latest 698031349056.dkr.ecr.ap-south-1.amazonaws.com/academic-deadline-app:latest

# Push to ECR
docker push 698031349056.dkr.ecr.ap-south-1.amazonaws.com/academic-deadline-app:latest
```

### 7. Create Application Secrets
```bash
kubectl create secret generic academic-deadline-secret \
  --from-literal=EMAIL_USER="2002ak2002@gmail.com" \
  --from-literal=EMAIL_PASS="prgi uvhi dpri wlaz" \
  --from-literal=SESSION_SECRET="a3b2f8d23c84c5eaf8dca92b21a1c9d739e24c88b9db19e88b0d4f5e7e1c6f9d" \
  -n academic-deadline
```

### 8. Deploy Application
```bash
# Update the deployment file with your account ID
sed -i 's/YOUR_ACCOUNT_ID/698031349056/g' k8s-deployment-aws-final.yaml

# Apply deployment
kubectl apply -f k8s-deployment-aws-final.yaml

# Wait for deployment
kubectl wait --for=condition=available --timeout=600s deployment/mongodb -n academic-deadline
kubectl wait --for=condition=available --timeout=600s deployment/academic-deadline-app -n academic-deadline
```

### 9. Get LoadBalancer URL
```bash
# Check service status
kubectl get service academic-deadline-service -n academic-deadline

# Wait for external IP and get URL
kubectl get service academic-deadline-service -n academic-deadline -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

## 🔍 Verification Commands

### Check Cluster Status
```bash
kubectl cluster-info
kubectl get nodes
kubectl get all -n academic-deadline
```

### Check Application Health
```bash
# Get LoadBalancer URL
LB_URL=$(kubectl get service academic-deadline-service -n academic-deadline -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "Application URL: http://$LB_URL"

# Test health endpoint
curl -f http://$LB_URL/health
```

### Check Logs
```bash
kubectl logs -f deployment/academic-deadline-app -n academic-deadline
kubectl logs -f deployment/mongodb -n academic-deadline
```

## 💰 Cost Estimation for ap-south-1

| Resource | Monthly Cost (INR) | Monthly Cost (USD) |
|----------|-------------------|-------------------|
| EKS Cluster | ₹5,500 | ~$66 |
| EC2 Instances (3x t3.medium) | ₹7,200 | ~$86 |
| EBS Storage (20GB) | ₹160 | ~$2 |
| Network Load Balancer | ₹1,200 | ~$14 |
| **Total** | **₹14,060** | **~$168** |

*Note: Prices are approximate and may vary based on actual usage and AWS pricing changes.*

## 🛠️ Jenkins Pipeline Configuration for ap-south-1

When using the Jenkins pipeline, ensure these parameters are set:

```groovy
parameters {
    string(name: 'EKS_CLUSTER_NAME', defaultValue: 'academic-deadline-cluster')
    choice(name: 'AWS_REGION', choices: ['ap-south-1'], description: 'AWS Region')
    string(name: 'K8S_NAMESPACE', defaultValue: 'academic-deadline')
}

environment {
    AWS_ACCOUNT_ID = '698031349056'
    ECR_REPO = "698031349056.dkr.ecr.ap-south-1.amazonaws.com/academic-deadline"
}
```

## 🔧 Troubleshooting for ap-south-1

### Common Issues
1. **EKS API Rate Limiting**: ap-south-1 might have different rate limits
2. **Availability Zone Issues**: Ensure subnets are in different AZs
3. **Instance Type Availability**: Some instance types might not be available

### Debug Commands
```bash
# Check AWS CLI configuration
aws configure list
aws sts get-caller-identity

# Check EKS cluster status
aws eks describe-cluster --name academic-deadline-cluster --region ap-south-1

# Check Load Balancer Controller status
kubectl get deployment -n kube-system aws-load-balancer-controller
kubectl logs -n kube-system deployment/aws-load-balancer-controller

# Check EBS CSI Driver
kubectl get pods -n kube-system -l app=ebs-csi-controller
```

## 📚 Additional Resources

- [AWS ap-south-1 Regional Services](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/)
- [EKS Pricing ap-south-1](https://aws.amazon.com/eks/pricing/)
- [ECR Pricing ap-south-1](https://aws.amazon.com/ecr/pricing/)

---

**Important**: Replace all placeholder values (like email credentials and session secrets) with your actual secure values before deployment.
