"""Client for communicating with the Perch AI Service."""
import asyncio
import logging
from typing import Dict, Any, AsyncIterator, Optional
import httpx
import json

logger = logging.getLogger(__name__)


class PerchServiceError(Exception):
    """Exception raised when the perch service returns an error."""
    pass


class PerchServiceClient:
    """Client for interacting with the Perch AI Service."""
    
    def __init__(self, base_url: str, timeout: float = 60.0, connection_timeout: float = 10.0):
        """
        Initialize the perch service client.
        
        Args:
            base_url: Base URL of the perch service (e.g., "http://localhost:9000")
            timeout: Timeout for generation requests in seconds
            connection_timeout: Timeout for establishing connection in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.connection_timeout = connection_timeout
    
    async def summarize_stream(
        self,
        prompt: str,
        customer_data: Dict[str, Any],
        documents: list,
        messages: list
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Request a summary from the perch service and stream the response.
        
        Args:
            prompt: The prompt template
            customer_data: Customer profile data
            documents: List of customer documents
            messages: List of customer messages
            
        Yields:
            Dict containing token data: {"order": int, "token": str, "hallucination_prob": float}
            
        Raises:
            PerchServiceError: If the service returns an error
            httpx.TimeoutException: If the request times out
            httpx.ConnectError: If cannot connect to the service
        """
        url = f"{self.base_url}/api/v1/summarize"
        
        payload = {
            "prompt": prompt,
            "customer_data": customer_data,
            "documents": documents,
            "messages": messages
        }
        
        logger.info(f"Requesting summary from perch service: {url}")
        logger.info(f"Payload summary: customer_id={customer_data.get('customer_id')}, "
                    f"num_documents={len(documents)}, num_messages={len(messages)}")
        logger.debug(f"Full payload: {json.dumps(payload, indent=2, default=str)[:500]}...")
        
        try:
            # Use httpx for async HTTP with streaming support
            timeout_config = httpx.Timeout(
                timeout=self.timeout,
                connect=self.connection_timeout
            )
            
            async with httpx.AsyncClient(timeout=timeout_config) as client:
                async with client.stream(
                    'POST',
                    url,
                    json=payload,
                    headers={"Accept": "text/event-stream"}
                ) as response:
                    # Check for HTTP errors
                    if response.status_code != 200:
                        error_text = await response.aread()
                        logger.error(f"Perch service returned error: {response.status_code} - {error_text}")
                        raise PerchServiceError(
                            f"Perch service returned status {response.status_code}: {error_text.decode('utf-8', errors='ignore')}"
                        )
                    
                    # Stream SSE events
                    logger.info("Streaming response from perch service")
                    async for line in response.aiter_lines():
                        line = line.strip()
                        
                        # SSE format: "data: {...}\n\n"
                        if line.startswith('data: '):
                            data_str = line[6:]  # Remove "data: " prefix
                            
                            try:
                                data = json.loads(data_str)
                                
                                # Check for error messages in stream
                                if data.get('type') == 'error':
                                    logger.error(f"Error in stream: {data.get('message')}")
                                    raise PerchServiceError(data.get('message', 'Unknown error'))
                                
                                # Yield token data
                                yield data
                                
                            except json.JSONDecodeError as e:
                                logger.warning(f"Failed to parse SSE data: {data_str}, error: {e}")
                                continue
                    
                    logger.info("Finished streaming response from perch service")
                    
        except httpx.TimeoutException as e:
            logger.error(f"Timeout while connecting to perch service: {e}")
            raise PerchServiceError(f"Request to perch service timed out: {e}")
        except httpx.ConnectError as e:
            logger.error(f"Cannot connect to perch service at {url}: {e}")
            raise PerchServiceError(f"Cannot connect to perch service: {e}")
        except Exception as e:
            logger.error(f"Unexpected error while communicating with perch service: {e}")
            raise PerchServiceError(f"Unexpected error: {e}")
    
    async def health_check(self) -> bool:
        """
        Check if the perch service is available.
        
        Returns:
            True if service is healthy, False otherwise
        """
        url = f"{self.base_url}/health"
        
        try:
            timeout_config = httpx.Timeout(connect=self.connection_timeout)
            async with httpx.AsyncClient(timeout=timeout_config) as client:
                response = await client.get(url)
                return response.status_code == 200
        except Exception as e:
            logger.warning(f"Perch service health check failed: {e}")
            return False

