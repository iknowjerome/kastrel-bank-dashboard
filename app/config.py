"""Configuration loading for Dashboard."""
import os
import yaml
from pathlib import Path
from typing import Dict, Any, Optional


def load_config(env: Optional[str] = None) -> Dict[str, Any]:
    """Load configuration from YAML file based on environment."""
    if env is None:
        env = os.getenv('KASTREL_ENV', 'dev')
    
    config_dir = Path(__file__).parent.parent / 'config'
    config_file = config_dir / f'{env}.yaml'
    
    if not config_file.exists():
        raise FileNotFoundError(f"Config file not found: {config_file}")
    
    with open(config_file, 'r') as f:
        config = yaml.safe_load(f)
    
    # Expand environment variables
    config = _expand_env_vars(config)
    
    return config


def _expand_env_vars(config: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively expand ${VAR} patterns in config values."""
    if isinstance(config, dict):
        return {k: _expand_env_vars(v) for k, v in config.items()}
    elif isinstance(config, list):
        return [_expand_env_vars(item) for item in config]
    elif isinstance(config, str) and config.startswith('${') and config.endswith('}'):
        var_name = config[2:-1]
        return os.getenv(var_name, config)
    return config

