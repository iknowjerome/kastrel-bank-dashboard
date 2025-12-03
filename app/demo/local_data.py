"""Load local/pre-recorded data for demos."""
import json
from pathlib import Path
from typing import List, Dict, Any, Optional


class LocalDataLoader:
    """Load pre-recorded trace data from local files."""
    
    def __init__(self, data_path: str):
        self.data_path = Path(data_path).expanduser()
        self.data_path.mkdir(parents=True, exist_ok=True)
    
    def load(self, filename: Optional[str] = None) -> List[Dict[str, Any]]:
        """Load trace data from a JSON file."""
        if filename is None:
            # Load all files
            all_data = []
            for f in self.data_path.glob("*.json"):
                all_data.extend(self._load_file(f))
            return all_data
        
        file_path = self.data_path / filename
        if not file_path.exists():
            raise FileNotFoundError(f"Data file not found: {file_path}")
        
        return self._load_file(file_path)
    
    def _load_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Load a single JSON file."""
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        # Handle both list and single object
        if isinstance(data, list):
            return data
        return [data]
    
    def list_available(self) -> List[str]:
        """List available data files."""
        return [f.name for f in self.data_path.glob("*.json")]
    
    def save(self, filename: str, data: List[Dict[str, Any]]):
        """Save trace data to a JSON file (for recording demos)."""
        file_path = self.data_path / filename
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)

