/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the app component tree
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('💥 App crashed with error:', error);
    console.error('💥 Error info:', errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReload = () => {
    // Reset error state to try again
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong 💥</Text>
          <Text style={styles.message}>
            The app has encountered an error. Please try reloading or restart the app manually.
          </Text>
          
          {__DEV__ && this.state.error && (
            <>
              <Text style={styles.errorTitle}>Error Details (Dev Mode):</Text>
              <Text style={styles.errorText}>
                {this.state.error.toString()}
              </Text>
            </>
          )}
          
          <TouchableOpacity style={styles.button} onPress={this.handleReload}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
          
          <Text style={styles.helpText}>
            If the problem persists, please restart the app manually.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#dc3545',
    marginTop: 20,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'monospace',
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  helpText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
  },
});

export default ErrorBoundary;