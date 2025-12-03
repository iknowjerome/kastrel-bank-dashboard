#!/usr/bin/env python3
"""
Simulate a perch with a real HuggingFace model connecting to the Dashboard.

This script:
1. Loads a GPT-2 model
2. Connects to your Kastrel Dashboard (local or AWS)
3. Runs inference and sends real activation traces

Usage:
    python dev/simulate_perch_with_model.py --url http://16.52.95.239:8080
    python dev/simulate_perch_with_model.py --url http://localhost:8080
"""
import argparse
import requests
import time
import uuid
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer


def register_perch(dashboard_url: str, agent_id: str, model_name: str) -> bool:
    """Register this perch with the dashboard."""
    try:
        resp = requests.post(
            f"{dashboard_url}/api/v1/agents/register",
            json={
                "agent_id": agent_id,
                "model_info": {
                    "model_name": model_name,
                    "model_type": "huggingface",
                    "framework": "pytorch"
                }
            },
            timeout=10
        )
        if resp.status_code == 200:
            print(f"✓ Registered with dashboard as {agent_id}")
            return True
        else:
            print(f"✗ Registration failed: {resp.status_code}")
            return False
    except Exception as e:
        print(f"✗ Cannot connect to dashboard: {e}")
        return False


def send_traces(dashboard_url: str, agent_id: str, traces: dict, metadata: dict) -> bool:
    """Send activation traces to the dashboard."""
    try:
        resp = requests.post(
            f"{dashboard_url}/api/v1/traces",
            json={
                "agent_id": agent_id,
                "traces": traces,
                "metadata": metadata
            },
            timeout=10
        )
        return resp.status_code == 200
    except Exception as e:
        print(f"✗ Failed to send traces: {e}")
        return False


def extract_activations(model, inputs, layer_names: list) -> dict:
    """
    Run forward pass and extract activations from specified layers.
    This is a simplified version - the real kastrel-api perch does this more elegantly.
    """
    activations = {}
    hooks = []
    
    def make_hook(name):
        def hook(module, input, output):
            if isinstance(output, tuple):
                output = output[0]
            # Store shape and summary stats (not full tensor for network efficiency)
            activations[name] = {
                "shape": list(output.shape),
                "mean": float(output.mean()),
                "std": float(output.std()),
                "min": float(output.min()),
                "max": float(output.max()),
            }
        return hook
    
    # Register hooks on transformer layers
    for name, module in model.named_modules():
        if any(layer_name in name for layer_name in layer_names):
            hooks.append(module.register_forward_hook(make_hook(name)))
    
    # Forward pass
    with torch.no_grad():
        model(**inputs)
    
    # Remove hooks
    for hook in hooks:
        hook.remove()
    
    return activations


def main():
    parser = argparse.ArgumentParser(description="Simulate perch with real model")
    parser.add_argument('--url', default='http://localhost:8080', help='Dashboard URL')
    parser.add_argument('--model', default='gpt2', help='HuggingFace model name')
    parser.add_argument('--iterations', type=int, default=10, help='Number of inference runs')
    parser.add_argument('--delay', type=float, default=3.0, help='Seconds between traces')
    args = parser.parse_args()
    
    agent_id = f"perch-{args.model.replace('/', '-')}-{uuid.uuid4().hex[:6]}"
    
    print("=" * 60)
    print("Kastrel Perch Simulator (Real Model)")
    print("=" * 60)
    print(f"  Model:     {args.model}")
    print(f"  Dashboard: {args.url}")
    print(f"  Agent ID:  {agent_id}")
    print("=" * 60)
    
    # Check dashboard health
    print("\n[1/4] Checking dashboard connection...")
    try:
        resp = requests.get(f"{args.url}/api/v1/health", timeout=5)
        if resp.status_code != 200:
            print(f"✗ Dashboard returned status {resp.status_code}")
            return
        print(f"✓ Dashboard is healthy")
    except Exception as e:
        print(f"✗ Cannot reach dashboard at {args.url}: {e}")
        return
    
    # Load model
    print(f"\n[2/4] Loading {args.model}...")
    try:
        tokenizer = AutoTokenizer.from_pretrained(args.model)
        model = AutoModelForCausalLM.from_pretrained(args.model)
        model.eval()
        
        # Set pad token if not set
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        num_layers = len([n for n, _ in model.named_modules() if '.h.' in n and n.endswith('.mlp')])
        print(f"✓ Model loaded ({num_layers} transformer layers)")
    except Exception as e:
        print(f"✗ Failed to load model: {e}")
        return
    
    # Register with dashboard
    print(f"\n[3/4] Registering with dashboard...")
    if not register_perch(args.url, agent_id, args.model):
        return
    
    # Run inference and send traces
    print(f"\n[4/4] Running inference and sending traces...")
    print("-" * 60)
    
    prompts = [
        "The quick brown fox",
        "In a world where AI",
        "The capital of France is",
        "def fibonacci(n):",
        "Once upon a time",
        "The meaning of life is",
        "Machine learning models",
        "SELECT * FROM users WHERE",
        "The weather today is",
        "Breaking news:",
    ]
    
    # Layers to monitor
    layer_patterns = ['.h.', '.mlp', '.attn']
    
    for i in range(args.iterations):
        prompt = prompts[i % len(prompts)]
        print(f"\n[{i+1}/{args.iterations}] Prompt: \"{prompt}\"")
        
        # Tokenize
        inputs = tokenizer(prompt, return_tensors="pt", padding=True)
        
        # Extract activations
        activations = extract_activations(model, inputs, layer_patterns)
        
        # Generate some text too
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=20,
                do_sample=True,
                temperature=0.7,
                pad_token_id=tokenizer.pad_token_id
            )
        generated = tokenizer.decode(outputs[0], skip_special_tokens=True)
        print(f"  Generated: \"{generated[:60]}...\"")
        
        # Send traces to dashboard
        metadata = {
            "timestamp": time.time(),
            "iteration": i + 1,
            "prompt": prompt,
            "generated_length": len(outputs[0]),
            "model_info": {
                "model_name": args.model,
                "device": "cpu"
            }
        }
        
        if send_traces(args.url, agent_id, activations, metadata):
            print(f"  ✓ Sent {len(activations)} layer activations to dashboard")
        else:
            print(f"  ✗ Failed to send traces")
        
        if i < args.iterations - 1:
            time.sleep(args.delay)
    
    print("\n" + "=" * 60)
    print("✅ Simulation complete!")
    print(f"   Check your dashboard at {args.url}")
    print("=" * 60)


if __name__ == '__main__':
    main()

