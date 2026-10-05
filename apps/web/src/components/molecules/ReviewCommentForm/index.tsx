'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import Button from '@/components/atoms/Button';
import { Textarea } from '@/components/atoms/FormTextarea';
import StarRating from '@/components/atoms/StarRating';
import Typography from '@/components/atoms/Typography';
import {
  type ReviewCommentFormData,
  reviewCommentSchema,
} from '@/lib/validations/reviewComment.schema';

const BODY_MAX_LENGTH = 1000;
const DEFAULT_VALUES: ReviewCommentFormData = { rating: 0, body: '' };
const FALLBACK_ERROR = 'No se pudo publicar el comentario. Inténtalo de nuevo más tarde.';

/** Props of `ReviewCommentForm`. */
export interface ReviewCommentFormProps {
  /** Receives valid data; throw an `Error` with a readable message to show it. */
  onSubmit: (data: ReviewCommentFormData) => Promise<void>;
  isPending?: boolean;
}

/** ReviewCommentForm - Presentational rating (1-5) + optional comment form. */
export function ReviewCommentForm({
  onSubmit,
  isPending = false,
}: Readonly<ReviewCommentFormProps>) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ReviewCommentFormData>({
    resolver: zodResolver(reviewCommentSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const bodyLength = watch('body')?.length ?? 0;

  const handleFormSubmit = async (data: ReviewCommentFormData) => {
    setSubmitError(null);
    setSubmitted(false);
    try {
      await onSubmit(data);
      reset(DEFAULT_VALUES);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : FALLBACK_ERROR);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-5"
    >
      <Typography as="h3" variant="subtitle">
        Escribe tu valoración
      </Typography>

      <Controller
        name="rating"
        control={control}
        render={({ field }) => (
          <StarRating
            label="Valoración"
            required
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            name={field.name}
            error={errors.rating?.message}
          />
        )}
      />

      <div className="flex flex-col gap-1">
        <Textarea
          label="Comentario (opcional)"
          placeholder="Cuenta tu experiencia con esta oferta…"
          rows={4}
          maxLength={BODY_MAX_LENGTH}
          error={errors.body?.message}
          {...register('body')}
        />
        <Typography variant="form-hint" className="self-end" aria-live="polite">
          {bodyLength}/{BODY_MAX_LENGTH} caracteres
        </Typography>
      </div>

      {submitError && (
        <Typography variant="small" className="text-danger" role="alert">
          {submitError}
        </Typography>
      )}

      {submitted && (
        <div role="status" aria-live="polite">
          <Typography variant="small" className="text-success">
            ¡Gracias! Tu valoración se ha publicado.
          </Typography>
        </div>
      )}

      <Button type="submit" variant="primary" disabled={isPending} className="self-start">
        {isPending ? 'Publicando…' : 'Publicar valoración'}
      </Button>
    </form>
  );
}

export default ReviewCommentForm;
