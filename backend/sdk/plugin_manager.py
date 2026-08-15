from typing import Dict, Any, List
import importlib
import logging

logger = logging.getLogger(__name__)

class PluginManager:
    """
    Manages the dynamic loading of scientific instrument modules (Plugins).
    Ensures that adding a new instrument doesn't require modifying the core.
    """
    
    def __init__(self):
        self._plugins: Dict[str, Any] = {}
        
    def register_plugin(self, instrument_id: str, plugin_module_path: str):
        """
        Registers an instrument plugin.
        """
        try:
            module = importlib.import_module(plugin_module_path)
            # A valid plugin must define a 'setup_plugin' function
            if hasattr(module, 'setup_plugin'):
                plugin_instance = module.setup_plugin()
                self._plugins[instrument_id] = plugin_instance
                logger.info(f"Successfully registered plugin: {instrument_id}")
            else:
                logger.error(f"Module {plugin_module_path} is missing 'setup_plugin'.")
        except Exception as e:
            logger.error(f"Failed to load plugin {instrument_id}: {e}")

    def get_plugin(self, instrument_id: str) -> Any:
        return self._plugins.get(instrument_id)

    @property
    def registered_instruments(self) -> List[str]:
        return list(self._plugins.keys())

plugin_manager = PluginManager()
