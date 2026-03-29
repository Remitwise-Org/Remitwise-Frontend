import SwaggerUIWrapper from './SwaggerUIWrapper';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Documentation - RemitWise',
  description: 'Complete API documentation for RemitWise remittance and financial planning services',
};

export default function ApiDocs() {
  return <SwaggerUIWrapper specUrl="/api/docs/spec" />;
}
